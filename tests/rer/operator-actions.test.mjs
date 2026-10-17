import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import {test} from 'node:test';
import {withOperatorWorkspace} from './operator-workspace.mjs';
import {operatorActionsJourney} from './operator-actions-journey.mjs';

test('BASE-PUBLIC-003 T099 native keyboard navigation, form validation, dialog focus and reviewed record changes', {timeout:30*60000},()=>withOperatorWorkspace({name:'actions',widths:[1440,390,320]},operatorActionsJourney));
