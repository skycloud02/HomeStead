#version 410 core

in vec3 fNormal;
in vec4 fPosEye;
in vec2 fTexCoords;
in vec4 fPosit;

out vec4 fColor;

uniform	vec3 lightDir;
uniform	vec3 lightColor;
uniform sampler2D diffuseTexture;
uniform sampler2D specularTexture;

vec3 ambient;
float ambientStrength = 0.2f;
vec3 diffuse;
vec3 specular;
float specularStrength = 0.5f;
float shininess = 32.0f;

vec3 viewDirN;
vec3 normalEye;

in vec4 fragPosLightSpace;
uniform sampler2D shadowMap;

float constant = 1.0f;
float linear = 0.5f;
float quadratic = 5.0f;

struct SpotLight {
	vec3 position;
	vec3 color;
};
#define NR_SPOT_LIGHTS 2
uniform SpotLight spotLights[NR_SPOT_LIGHTS];

void computeLightComponents()
{		
	vec3 cameraPosEye = vec3(0.0f);
	normalEye = normalize(fNormal);	
	vec3 lightDirN = normalize(lightDir - fPosEye.xyz);
	viewDirN = normalize(cameraPosEye - fPosEye.xyz);
	ambient = ambientStrength * lightColor;
	diffuse = max(dot(normalEye, lightDirN), 0.0f) * lightColor;
	vec3 reflection = reflect(-lightDirN, normalEye);
	float specCoeff = pow(max(dot(viewDirN, reflection), 0.0f), shininess);
	specular = specularStrength * specCoeff * lightColor;
}

float computeFog()
{
	float fogDensity = 0.05f;
	float fragmentDistance = length(fPosEye);
	float fogFactor = exp(-pow(fragmentDistance * fogDensity, 2));
	return clamp(fogFactor, 0.0f, 1.0f);
}

float computeShadow() 
{
    vec3 normalizedCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
	if (normalizedCoords.z > 1.0f)
	{
		return 0.0f;
	}
    normalizedCoords = normalizedCoords * 0.5 + 0.5;
    float closestDepth = texture(shadowMap, normalizedCoords.xy).r;
    float currentDepth = normalizedCoords.z;
	float bias = 0.001f;
	float shadow = 0.0f;
	vec2 texelSize = 1.0 / textureSize(shadowMap, 0);
	for (float x = -1.0f; x <= 1.0f; x += 0.25f) {
		for (float y = -1.0f; y <= 1.0f; y += 0.25f) {
			float pcfDepth = texture(shadowMap, normalizedCoords.xy + vec2(x, y) * texelSize).r;
			shadow += currentDepth - bias > pcfDepth ? 1.0f : 0.0f;
		}
	}
	shadow /= 81.0f;
    return shadow;
}

vec3 computeSpotLight(SpotLight spotLight) {
	vec3 lightDir = normalize(spotLight.position - fPosit.xyz);
	float diff = max(dot(normalEye, lightDir), 0.0);
	vec3 reflectDir = reflect(-lightDir, normalEye);
	float spec = pow(max(dot(viewDirN, reflectDir), 0.0), shininess);
	float dist = length(spotLight.position - fPosit.xyz);
	float att = 1.0f/(constant + linear * dist + quadratic * dist * dist);

	vec3 ambientPl = ambient * texture(diffuseTexture, fTexCoords).rgb * spotLight.color * att;
	vec3 diffusePl = diffuse * diff * texture(diffuseTexture, fTexCoords).rgb * spotLight.color * att;
	vec3 specularPl = specular * spec * texture(specularTexture, fTexCoords).rgb * spotLight.color * att;
	return ambientPl + diffusePl + specularPl;
}

void main() 
{
	computeLightComponents();
	
	vec3 baseColor = vec3(0.9f, 0.35f, 0.0f);//orange
	
	ambient *= texture(diffuseTexture, fTexCoords).rgb;
	diffuse *= texture(diffuseTexture, fTexCoords).rgb;
	specular *= texture(specularTexture, fTexCoords).rgb;

	float shadow = computeShadow();

    vec3 color = min((ambient + (1.0f - shadow) * diffuse) + (1.0f - shadow) * specular, 1.0f);
   
for (int i = 0; i < NR_SPOT_LIGHTS; i++) {
		color += computeSpotLight(spotLights[i]);
	}

	float fogFactor = computeFog();
	vec3 fogColor = vec3(0.5f, 0.5f, 0.5f);

	fColor = vec4(fogColor * (1 - fogFactor) + color * fogFactor, 1.0f);
}
