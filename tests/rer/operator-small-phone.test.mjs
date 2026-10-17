import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import {test} from 'node:test';
import {withOperatorWorkspace} from './operator-workspace.mjs';
import {operatorRouteJourney} from './operator-route-journey.mjs';

test('BASE-PUBLIC-003 T099 native operator routes and expanded data views at 320px',{timeout:30*60000},()=>withOperatorWorkspace({name:'routes-320',widths:[320],observeSetup:true},context=>operatorRouteJourney(context,320)));
