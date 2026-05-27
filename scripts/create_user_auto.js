(async function(){
  try{
    const apiKey = 'AIzaSyD_vtTquXKQBX1J7fzPUGTCuuJxriQyUfw';
    const email = `rh.obra.auto+${Date.now()}@example.com`;
    const password = 'AutoPass!234';
    const role = 'rh_obra_residencial-vila-nova';
    const obraId = 'residencial-vila-nova';

    console.log('Creating auth user:', email);
    const authResp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const authData = await authResp.json();
    if(!authResp.ok){
      console.error('Auth error', authData);
      process.exit(1);
    }
    const uid = authData.localId;
    const idToken = authData.idToken;
    console.log('Created user uid=', uid);

    const body = {
      fields: {
        uid: { stringValue: uid },
        nome: { stringValue: 'RH Obra Automático' },
        email: { stringValue: email },
        role: { stringValue: role },
        obraId: { stringValue: obraId },
      },
    };

    console.log('Writing Firestore document for uid=', uid);
    const projectId = 'rhger-b7349';
    const docResp = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/usuarios?documentId=${uid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify(body),
    });
    const docData = await docResp.json();
    if(!docResp.ok){
      console.error('Firestore error', docData);
      process.exit(1);
    }
    console.log('Firestore document written:', docData.name);
    console.log(JSON.stringify({ uid, email, password, role, obraId }));
  }catch(e){
    console.error('Unexpected error', e);
    process.exit(1);
  }
})();
