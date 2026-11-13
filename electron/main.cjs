const {app, BrowserWindow, shell, protocol, net} = require('electron');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

// Desktop GLB/image fetches need a proper secure origin. Loading index.html
// via file:// can prevent GLTFLoader from fetching sibling files.
protocol.registerSchemesAsPrivileged([{
  scheme:'mandalay', privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}
}]);

const distRoot = path.resolve(__dirname, '../dist');
function registerLocalAppProtocol(){
  protocol.handle('mandalay', async request => {
    try {
      const url=new URL(request.url);
      const rel=decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
      const file=path.resolve(distRoot, rel);
      if (!(file===distRoot || file.startsWith(distRoot+path.sep))) {
        return new Response('Forbidden',{status:403});
      }
      return net.fetch(pathToFileURL(file).toString());
    } catch(err) {console.error('Asset failed to load:',err);return new Response('Not found',{status:404});}
  });
}
function createWindow(){
  const win = new BrowserWindow({
    width:1440,height:900,minWidth:950,minHeight:630,
    backgroundColor:'#253d4a',title:'Mandalay Life v4.2',autoHideMenuBar:true,
    webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}
  });
  win.loadURL('mandalay://app/index.html');
  win.webContents.setWindowOpenHandler(({url})=>{
    if(url.startsWith('https://'))shell.openExternal(url);
    return {action:'deny'};
  });
}
app.whenReady().then(()=>{
  registerLocalAppProtocol();createWindow();
  app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
