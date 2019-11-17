# letarette.js example project

An example project using the search client and document manager components.

## Search client
The search client connects to a Letarette cluster, reads queries from stdin
and searches the default "docs" space.

## Document manager
The document manager implementation presents 365 recipies from the great book
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
With a NATS server running at the local machine, and a letarette server
up and running, launch the search client using `npx ts-node search.ts`.

If you want to search "365 Luncheon Dishes", launch the document server
first, using `npx ts-node docserver.ts`.
