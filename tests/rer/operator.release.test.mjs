import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import {test} from 'node:test';
import {withOperatorWorkspace} from './operator-workspace.mjs';
import {operatorRouteJourney} from './operator-route-journey.mjs';
import {operatorActionsJourney} from './operator-actions-journey.mjs';
test('declared installer opens all native operator routes and persists reviewed keyboard actions',{timeout:30*60000},()=>withOperatorWorkspace({name:'operator',widths:[1440],observeSetup:true},async context=>{await operatorRouteJourney(context,1440);await operatorActionsJourney(context);}));
