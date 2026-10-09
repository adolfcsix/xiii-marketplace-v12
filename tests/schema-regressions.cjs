require('reflect-metadata');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const mongoose=require('mongoose');
const root=path.resolve(__dirname,'../services/api');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
for(const file of files(root+'/src').filter(file=>file.endsWith('.schema.ts'))){
 const source=fs.readFileSync(file,'utf8');
 const fields=[...source.matchAll(/@Prop\(\{([\s\S]*?)\}\)\s*(\w+)[?!]?\s*:/g)].filter(match=>match[1].includes('MongooseSchema.Types.ObjectId'));
 if(!fields.length)continue;
 test(path.relative(root+'/src',file)+': ID fields cast strings to BSON ObjectId',()=>{
  const exported=require(file.replace('/src/','/dist/').replace(/\.ts$/,'.js'));
  for(const field of fields){
   const classes=[...source.slice(0,field.index).matchAll(/export class (\w+)/g)];
   const className=classes.at(-1)[1];
   const schema=exported[className+'Schema'];assert.ok(schema,className+'Schema must exist');
   const schemaPath=schema.path(field[2]);assert.ok(schemaPath,className+'.'+field[2]);
   const isArray=/type:\s*\[/.test(field[1]);
   const hex='507f1f77bcf86cd799439011';
   const cast=schemaPath.cast(isArray?[hex]:hex);
   const value=isArray?cast[0]:cast;
   assert.ok(value instanceof mongoose.Types.ObjectId,className+'.'+field[2]+' must be ObjectId, not Mixed');
   assert.equal(value.toHexString(),hex);
  }
 });
}
