import {test} from 'node:test';
import {providerFixture} from '../support/capture-provider-fixture';
import {reviewMailAssociations} from '../support/sanity-mail-association';

test('CAPTURE-010 reviewed mail associations survive archive restore and contact erasure removes their private evidence',async()=>{
 const f=await providerFixture('google');
 try{await reviewMailAssociations(f,true);}finally{await f.dispose();}
});
