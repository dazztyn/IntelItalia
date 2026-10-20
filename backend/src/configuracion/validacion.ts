import Joi from 'joi';

export interface VariablesEntorno {
  NODE_ENV: 'development' | 'production' | 'test';
  PUERTO: number;
  MONGO_URI: string;
  REDIS_URL: string;
  ORIGEN_FRONTEND: string;
  GOOGLE_CLIENT_ID: string;
  DOMINIO_GOOGLE_PERMITIDO?: string;
  JWT_SECRETO: string;
  JWT_DURACION_SEGUNDOS: number;
  CORREO_DIRECTORA_INICIAL?: string;
}

export const esquemaVariablesEntorno = Joi.object<VariablesEntorno>({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PUERTO: Joi.number().port().default(3000),
  MONGO_URI: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .required(),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .required(),
  ORIGEN_FRONTEND: Joi.string().uri().default('http://localhost:5173'),
  GOOGLE_CLIENT_ID: Joi.string().trim().min(10).required(),
  DOMINIO_GOOGLE_PERMITIDO: Joi.string().trim().allow('').optional(),
  JWT_SECRETO: Joi.string().min(32).required(),
  JWT_DURACION_SEGUNDOS: Joi.number().integer().positive().default(36000),
  CORREO_DIRECTORA_INICIAL: Joi.string().email().lowercase().optional(),
});
