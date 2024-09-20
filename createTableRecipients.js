import dotenv from 'dotenv';
dotenv.config();
import knexOptions from './knexOptions.js';
const knexOptionsEnv = knexOptions[process.env.NODE_ENV]

import Knex from 'knex';
const knex = Knex(knexOptionsEnv);

knex.schema.createTable('recipients', (table) => {
  table.increments('id')
  table.string('name')
  table.string('phone')
  table.string('email')
}).then( () => console.log("table created"))
.catch( (err) => { console.log(err); throw err })
.finally( () => {
  knex.destroy();
});
