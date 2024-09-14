const knexOptions = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: "./mydb.sqlite"
    },
    useNullAsDefault: true
  }
}

export default knexOptions;
