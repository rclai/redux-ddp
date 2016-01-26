# redux-ddp
Getting Meteor DDP collection data to get synced straight into a Redux store instead of minimongo and figuring out how to apply optimistic updates.

## What works

- Data is synced to the Redux store, not minimongo
- You can use different DDP connection objects, see the code
- As a result, you can use an alias for the collection you're syncing, see the code

## What doesn't work

- Optimistic updates. I would need to call on the store's dispatch function inside the method stub in order for it work properly. See [this issue](https://github.com/rclai/redux-ddp/issues/1) for more details.

## Implications of this

- No Mongo queries (on the client)
- No duplication of data in minimongo and Redux
- You need to depend on functional programming like `lodash` or `underscore` to query your collection, which is not so bad because you can still use `_.filter`, `_.map`, `_.reduce` and even `_.orderBy` on plain objects.

## Details

The collections are currently in a plain object, indexed by their IDs.

I am using Meteor's internal package `livedata`, which exposes a `registerStore` method on the DDP connection object to define a custom store to get the DDP data straight to the Redux store. `livedata` is the package that `minimongo` and other third-party packages like `numtel:mysql` and `ccorcos:any-db` use to feed the DDP data into their own store.

You can see the implementation [here](https://github.com/rclai/redux-ddp/blob/master/client/lib/ddp-redux.js).

## The gist

```js
import { createStore } from 'redux';
import { collectionReducer, syncCollectionToStore } from '/path/to/redux-ddp (not final yet)';

const rootReducer = combineReducers({
  collections: collectionReducer,
  // Your other reducers go here too most likely
});

// Create your store however you do it
const store = createStore(rootReducer);

// Call this after creating your store and your DDP collection
// will now be synced to your Redux store!
syncCollectionToStore('players', store);
// Sync other collections too
// syncCollectionToStore('todos', store);

// In your React components file
// Connect your React components with them
import React from 'react';
import { connect } from 'react-redux';
import _ from 'underscore';

const Players = React.createClass({ /* ... */ });
export default connect(
  ({ collections }) => ({
    // functional programming to the rescue?
    players: _.chain(collections.players)
              .filter(player => player.score > 20)
              .sortBy(player => -player.score)
              .value()
  });
)(Players);
```
