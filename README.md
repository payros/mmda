# Multi-Media Data Aggregator (MMDA)

## Purpose
The MMDA allows the users to name, annotate, store, and organize collections of data files into data
aggregates called Data-Aggregates (DAGR for short). A DAGR may contain an arbitrary number of multimedia
files, e.g. text documents, images, audio, video, and other previously created DAGRs.

## Installation
*First, make sure you have both [nodejs](https://nodejs.org/en/download/package-manager/) and the [node-oracledb](https://github.com/oracle/node-oracledb/blob/master/INSTALL.md) driver installed, then:* 


- Clone or download the project
- Run `npm install` from the project's root directory
- Add a `.env` file with DB credentials to the project's root directory (see below)
- Run `npm start`
- Navigate to `localhost:3000` or `127.0.0.1:3000` from your preferred browser


## Environment Variables
To setup the evironment variables for the DB connection you will have to create a `.env` file in the root directory using the following template:

```
DB_USERNAME=[YOUR_USERNAME]
DB_PASSWORD=[YOUR_PASSWORD]
DB_CONNECTSTRING=[YOUR_CONNECT_STRING]
```

Ask your DB admin for your specific credentials.

