import knexOptions from './knexOptions.js';
import Knex from 'knex';

const knexEnv = knexOptions[process.env.NODE_ENV];

const getKnexObj = () => {
  return Knex(knexEnv);
}

export default getKnexObj;
