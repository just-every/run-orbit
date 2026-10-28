import {test} from 'node:test';
import {connectSalesSources} from '../support/sales-sanity-sources';
test('SIGNAL-001 SIGNAL-003 SIGNAL-004 SIGNAL-009 INTEGRATE-001 INTEGRATE-005 INTEGRATE-007 REPORT-002 BOUNDARY-001 a seller connects and revokes sources, reviews real customer evidence and hands off only permitted Slack and audience data', {timeout:240000},connectSalesSources);
