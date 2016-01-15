import { createStore, applyMiddleware, combineReducers } from 'redux';
import { connect, Provider } from 'react-redux';
import thunk from 'redux-thunk';
import React, { PropTypes, Component } from 'react';
import { render } from 'react-dom';
import classNames from 'classnames';
import { _ } from 'meteor/underscore';
import { collectionReducer, syncCollectionToStore/*, simulateUpdate*/ } from './lib/ddp-redux';

const initialAppState = {
  selectedPlayerId: '',
};

const appReducer = (state = initialAppState, { type, payload }) => {
  switch (type) {
    case 'SELECT_PLAYER':
      return {
        ...state,
        selectedPlayerId: payload,
      };
    default:
      return state;
  }
};

const rootReducer = combineReducers({
  app: appReducer,
  collections: collectionReducer,
});

const store = applyMiddleware(thunk)(createStore)(rootReducer);

store.subscribe(() => {
  console.log(store.getState());
});

syncCollectionToStore('players', store);

Meteor.subscribe('players');

class Player extends Component {
  selectedClass() {
    const { selectedPlayer } = this.props;
    return classNames('player', { selected: selectedPlayer && selectedPlayer._id === this.props._id});
  }

  handleSelect(player, e) {
    this.props.onSelect(player, e);
  }

  render() {
    return (
      <li onClick={this.handleSelect.bind(this, this.props._id)} className={this.selectedClass()}>
        <span className="name">{this.props.name}</span>
        <span className="score">{this.props.score}</span>
      </li>
    );
  }
}

class Leaderboard extends Component {

  handleSelectPlayer(playerId, e) {
    const { selectedPlayer } = this.props;
    if (selectedPlayer && selectedPlayer._id === playerId) return;
    this.props.dispatch({
      type: 'SELECT_PLAYER',
      payload: playerId,
    });
  }

  handleIncreasePoints(e) {
    this.props.dispatch((dispatch, getState) => {
      const { app: { selectedPlayerId } } = getState();
      /*dispatch(simulateUpdate(
        'players', 
        selectedPlayerId, 
        { score: this.props.selectedPlayer.score + 5 }
      ));*/
      Meteor.call('players.update-score', selectedPlayerId, (error, result) => {
        error && console.error(error);
        result && console.log(result);
      });
    });
  }

  renderBottom() {
    if (this.props.selectedPlayer) {
      return (
        <div className="details">
          <div className="name">{this.props.selectedPlayer.name}</div>
          <button onClick={this.handleIncreasePoints.bind(this)} className="inc">Add 5 points</button>
        </div>
      );
    } else {
      return (
        <div className="message">Click a player to select</div>
      );
    }
  }

  renderPlayers() {
    return this.props.players.map(player => (
      <Player 
        key={player._id} 
        {...player}
        selectedPlayer={this.props.selectedPlayer}
        onSelect={this.handleSelectPlayer.bind(this)} />
    ));
  }

  render() {
    return (
      <div>
        <ol className="leaderboard">
          {this.renderPlayers()}
        </ol>
        {this.renderBottom()}
      </div>
    );
  }
}

const LeaderboardContainer = connect(
  ({ collections, app }) => ({
    players: _.sortBy(collections.players, 'score').reverse(),
    selectedPlayer: collections.players && collections.players[app.selectedPlayerId],
  })
)(Leaderboard);

const App = () => (
  <div className="outer">
    <div className="logo"></div>
    <h1 className="title">Leaderboard</h1>
    <div className="subtitle">Select a scientist to give them points</div>
    <LeaderboardContainer />
  </div>
);

Meteor.startup(() => {
  window.addEventListener('DOMContentLoaded', () => {
    let root = document.createElement('root');
    document.body.appendChild(root);

    render((
      <Provider store={store}>
        <App />
      </Provider>
    ), root);
  });
});
