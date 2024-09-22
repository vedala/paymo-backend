import dotenv from 'dotenv';
dotenv.config();
import knexOptions from './knexOptions.js';
const knexOptionsEnv = knexOptions[process.env.NODE_ENV]

import Knex from 'knex';
const knex = Knex(knexOptionsEnv);

knex.schema.createTable('management_access_token', (table) => {
  table.string('access_token')
  table.dateTime('created_at')
  table.integer('expires_in')
}).then( () => console.log("table created"))
.catch( (err) => { console.log(err); throw err })
.finally( () => {
  knex.destroy();
});
