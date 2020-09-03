# letarette.js example project

An example project using the Search Agent and Document Manager components.

## Search Agent
The search client example uses the Search Agent to connect to a Letarette cluster, then reads queries from stdin and searches the default "docs" space.

## Document Manager
The Document Manager example presents 365 recipies from the great book
"365 Luncheon Dishes - A Luncheon Dish for Every Day in the Year" to the
cluster, where each recipe becomes a document in the "docs" space.

The book contents is loaded from `pg24384.txt`, originally fetched from the
Gutenberg Project at http://www.gutenberg.org/2/4/3/8/24384/.

## Building
The example project is set up to use the local "letarette" package in the
root directory of the project. To set everything up, first run `npm install`
and `npm run build` in the root directory. Then move down to the `example`
directory and run `npm install` to install the newly built library.

## Running the example
The example requires a NATS server and a Letarette server up and running.
The NATS server is expected to run on the local machine (nats://localhost:4222).

For this example, both the NATS server and the letarette server can be started with no setup.
They both log to stdout, so need to run in separate shells: 

```shell
$ nats-server
[14214] 2020/09/03 22:28:11.890364 [INF] Starting nats-server version 2.1.6
[14214] 2020/09/03 22:28:11.890506 [INF] Git commit [not set]
[14214] 2020/09/03 22:28:11.912002 [INF] Listening for client connections on 0.0.0.0:4222
[14214] 2020/09/03 22:28:11.912025 [INF] Server id is NDNKHCE44J7I3EABXTNNXCOE37U7G3FAX3DDQSWR7SS5FK6UYF4J4C6Z
[14214] 2020/09/03 22:28:11.912034 [INF] Server is ready
```

```shell
$ letarette
[INFO] 2020/09/03 22:28:56 Starting Letarette 2020-09-02 (dev)
[INFO] 2020/09/03 22:28:56 Connecting to nats server at ["nats://localhost:4222"]
[INFO] 2020/09/03 22:28:56 Applying migrations
[INFO] 2020/09/03 22:28:56 Pre-loading database start
[INFO] 2020/09/03 22:28:56 Pre-loading database done
[INFO] 2020/09/03 22:28:56 Index@882C8D754AF775E16236A4B79095E825
```

Launch the document server first, using `npx ts-node docserver.ts`. This will start to feed the Letarette index with "365 Luncheon Dishes".

Next, launch the search client using `npx ts-node search.ts` and type in your best lunch-related queries.
