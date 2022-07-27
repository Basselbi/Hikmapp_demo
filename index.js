/**
 * @format evan
 */

import {AppRegistry} from 'react-native';
import { registerRootComponent } from 'expo';

import App from './App.tsx';
import {name as appName} from './app.json';
import 'react-native-get-random-values'

//AppRegistry.registerComponent(appName, () => App);
registerRootComponent(App);
