import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { _ } From 'meteor/underscore';

export const syncCollectionToStore = (
  collection, 
  store, 
  ddpConnection = Meteor.connection,
  collectionAlias = '',
) => {
  const { dispatch, getState } = store;

  const collectionName = collectionAlias || collection;
  // If you try to registerStore for the same
  // collection on the same DDP connection, it will throw
  
  ddpConnection.registerStore(collection, {
    beginUpdate(batchSize, reset) {
      //console.log('batchSize', batchSize);
      // This happens when your server has restarted
      // and your publications are reset with new data.
      // This involves clearing your collection, and then
      // it'll get filled back up
      if (reset) {
        console.log('reset', reset);
        dispatch(ddpAction('COLLECTION_RESET', { collection: collectionName }));
      }

      // Compared to minimongo, there's no need to pause
      // observers because of the way React works, so you won't
      // actually see a flicker (maybe?)!
    },

    update(packet) {
      //console.log('msg', packet, 'collection', packet.collection);
      const packetToProcess = { ...packet, collection: collectionName };
      if (packetToProcess.msg === 'added') {
        dispatch(ddpAction('COLLECTION_ADDED', packetToProcess));
      } else if (packetToProcess.msg === 'removed') {
        dispatch(ddpAction('COLLECTION_REMOVED', packetToProcess));
      } else if (packetToProcess.msg === 'changed') {
        dispatch(ddpAction('COLLECTION_CHANGED', packetToProcess));
      } else if (packetToProcess.msg === 'replace') {
        console.log('packet replace', packetToProcess);
        dispatch(ddpAction('COLLECTION_REPLACE', packetToProcess));
      } else {
        throw new Error("I don't know how to deal with this message");
      }
    },

    endUpdate() {
      //console.log('endUpdate');
    },

    // In order for these functions to help us do optimistic
    // updates, the dispatched actions need to happen inside
    // the method definition, but this means we have to call on
    // the store in a global manner
    /*saveOriginals() {

    },

    retrieveOriginals() {

    }*/
  });
};

const ddpAction = (actionType, packet) => ({
  type: actionType,
  payload: packet,
});

// Used by changedDoc function below
const updatedDoc = (oldDoc, fields) => {
  const newDoc = {
    ...oldDoc,
  };
  _.each(fields, (value, key) => {
    if (value === undefined) {
      newDoc[key] = null;
      delete doc[key];
    } else {
      // DDP doesn't care how nested fields have changed
      newDoc[key] = value;
    }
  });
  return newDoc;
};

const changedDoc = (state, collection, id, fields) => {
  return {
    ...state,
    [collection]: {
      ...state[collection],
      [id]: updatedDoc(state[collection][id], fields),
    },
  };
};

const removedDoc = (state, collection, id) => {
  return {
    ...state,
    [collection]: {
      ..._.omit(state[collection], id),
    }
  };
};

const addedDoc = (state, collection, id, fields) => {
  return {
    ...state,
    [collection]: {
      ...state[collection],
      [id]: {
        ...fields,
        _id: id,
      },
    },
  };
};

export const collectionReducer = (state = {}, { type, payload }) => {
  switch (type) {
    case 'COLLECTION_ADDED':
      var { collection, id, fields } = payload;
      return addedDoc(state, collection, id, fields);
    case 'COLLECTION_CHANGED':
      var { collection, id, fields } = payload;
      return changedDoc(state, collection, id, fields);
    case 'COLLECTION_REMOVED':
      var { collection, id } = payload;
      return removedDoc(state, collection, id);
    // This is when the optimistic UI operation is verified
    case 'COLLECTION_REPLACE':
      var { collection, id, replace } = payload;
      // This can work three ways
      if (!replace) {
        // Remove the doc
        return removedDoc(state, collection, id);
      } else if (!state[collection] || !state[collection][id]) {
        // Insert the doc
        return addedDoc(state, collection, id, replace);
      } else {
        // Update the doc
        return changedDoc(state, collection, id, replace);
      }
      // Not sure if this should ever happen?
      console.log('Optimistic UI fail?');
      return state;
    case 'COLLECTION_RESET':
      var { collection } = payload;
      return {
        ...state,
        [collection]: {},
      };
    default:
      return state
  }
};

/*export const simulateInsert = (collection, doc) => ({
  type: 'SIMULATE_COLLECTION_ADDED',
  payload: {
    collection,
    fields: doc,
  },
});

export const simulateUpdate = (collection, id, fields) => ({
  type: 'SIMULATE_COLLECTION_UPDATE',
  payload: {
    collection,
    id,
    fields,
  },
})

export const simulateRemove = (collection, id) => ({
  type: 'SIMULATE_COLLECTION_REMOVED',
  payload: {
    collection,
    id,
  },
});*/
