import React from 'react';
import {Provider} from 'react-redux';
import {AppRegistry} from 'react-native';
import AppContainer from './containers/app';
import configureStore from './store';

const store = configureStore;

const DubbingApp = () => {
    return (<Provider store={store}>
        <AppContainer/>
    </Provider>);
};

AppRegistry.registerComponent('DubbingApp', () => DubbingApp);