{{/*
Expand the name of the chart.
*/}}
{{- define "vocab-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "vocab-app.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "vocab-app.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Get database secret name - supports migration from legacy to new structure
*/}}
{{- define "vocab-app.databaseSecretName" -}}
{{- if .Values.secrets.useLegacySecret }}
{{- .Values.secrets.externalSecretName }}
{{- else }}
{{- .Values.secrets.database.secretName }}
{{- end }}
{{- end }}

{{/*
Get JWT secret name - supports migration from legacy to new structure
*/}}
{{- define "vocab-app.jwtSecretName" -}}
{{- if .Values.secrets.useLegacySecret }}
{{- .Values.secrets.externalSecretName }}
{{- else }}
{{- .Values.secrets.jwt.secretName }}
{{- end }}
{{- end }}

{{/*
Get Anthropic secret name - supports migration from legacy to new structure
*/}}
{{- define "vocab-app.anthropicSecretName" -}}
{{- if .Values.secrets.useLegacySecret }}
{{- .Values.secrets.externalSecretName }}
{{- else }}
{{- .Values.secrets.anthropic.secretName }}
{{- end }}
{{- end }}
