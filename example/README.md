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
and `npm run build` the the root directory. Then move down to the `example`
directory and run `npm install` to install the newly built library.

## Running the example
The example requires a NATS server and a Letarette server up and running.
The NATS server is expected to run on the local machine (nats://localhost:4222).

Launch the document server first, using `npx ts-node docserver.ts`. This will start to feed the Letarette index with "365 Luncheon Dishes".

Now, launch the search client using `npx ts-node search.ts` and type in your best lunch-related queries.
