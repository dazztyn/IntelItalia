import Joi from 'joi';

export interface VariablesEntorno {
  NODE_ENV: 'development' | 'production' | 'test';
  PUERTO: number;
  MONGO_URI: string;
  REDIS_URL: string;
  ORIGEN_FRONTEND: string;
}

// Si falta una variable obligatoria o tiene un formato inválido, la API no arranca.
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
});
