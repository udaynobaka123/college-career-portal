const multer=require('multer'),path=require('path'),fs=require('fs'),crypto=require('crypto');
const dir=path.resolve(process.env.UPLOAD_DIR||'public/uploads');fs.mkdirSync(dir,{recursive:true});
const storage=multer.diskStorage({destination:(req,file,cb)=>cb(null,dir),filename:(req,file,cb)=>cb(null,crypto.randomBytes(16).toString('hex')+path.extname(file.originalname).toLowerCase())});
const fileFilter=(req,file,cb)=>{const ok=file.mimetype==='application/pdf'&&path.extname(file.originalname).toLowerCase()==='.pdf';cb(ok?null:new Error('Only PDF documents are accepted.'),ok);};
exports.pdfUpload=multer({storage,fileFilter,limits:{fileSize:5*1024*1024,files:3}});
