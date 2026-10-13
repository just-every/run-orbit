import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {exercise} from './scenario';
test('delegation and handoff native routes against isolated real D1',async()=>{const fixture=await isolatedDatabase();try{await exercise(fixture.db);}finally{await fixture.dispose();}});
