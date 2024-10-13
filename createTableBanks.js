import dotenv from 'dotenv';
dotenv.config();
import knexOptions from './knexOptions.js';
const knexOptionsEnv = knexOptions[process.env.NODE_ENV]

import Knex from 'knex';
const knex = Knex(knexOptionsEnv);

knex.schema.createTable('banks', (table) => {
  table.increments('id')
  table.string('user_id')
  table.string('name')
  table.string('item_id')
  table.string('access_token')
  table.string('dwolla_processor_token')
  table.string('dwolla_processor_request_id')
}).then( () => console.log("table created"))
.catch( (err) => { console.log(err); throw err })
.finally( () => {
  knex.destroy();
});
