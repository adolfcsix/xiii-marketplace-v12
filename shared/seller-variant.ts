export type VariantInput = {sku:string;color:string;size:string;price:string;compareAtPrice:string;weight:string;image:string;available:string;lowStockThreshold:string};
export function variantPayload(row:VariantInput) {
  const price=Number(row.price);
  const compare=row.compareAtPrice?Number(row.compareAtPrice):undefined;
  const weight=Number(row.weight||0);
  const available=Number(row.available||0);
  const threshold=Number(row.lowStockThreshold||5);
  if(!row.sku.trim())throw new Error('Mỗi SKU phải có mã SKU');
  if(!row.price.trim()||!Number.isFinite(price)||price<0)throw new Error('Giá SKU không hợp lệ');
  if(compare!==undefined&&(!Number.isFinite(compare)||compare<0))throw new Error('Giá gốc không hợp lệ');
  if(!Number.isFinite(weight)||weight<0)throw new Error('Khối lượng không hợp lệ');
  if(!Number.isInteger(threshold)||threshold<0)throw new Error('Ngưỡng tồn kho phải là số nguyên ≥ 0');
  if(!Number.isInteger(available)||available<0)throw new Error('Tồn kho phải là số nguyên ≥ 0');
  return {
    sku:row.sku.trim().toUpperCase(),
    attributes:{...(row.color.trim()?{color:row.color.trim()}:{}),...(row.size.trim()?{size:row.size.trim()}:{} )},
    price,compareAtPrice:compare,weight,image:row.image.trim(),initialAvailable:available,lowStockThreshold:threshold,
  };
}

type VariantPayload = ReturnType<typeof variantPayload>;
type SellerRequest = (path:string, init:{method:string;body:string}) => Promise<unknown>;
/** Record a committed SKU before the separate stock request so retries update it. */
export async function persistSellerVariant(request:SellerRequest, productId:string,
  row:{id?:string;originalAvailable:number;status:string}, payload:VariantPayload,
  onCreated:(id:string)=>void):Promise<string> {
  let id=row.id;
  const fields={sku:payload.sku,attributes:payload.attributes,price:payload.price,
    compareAtPrice:payload.compareAtPrice,weight:payload.weight,image:payload.image};
  if(id){
    await request('/seller/variants/'+id,{method:'PATCH',body:JSON.stringify({...fields,compareAtPrice:payload.compareAtPrice??null,status:row.status})});
  }else{
    const created=await request('/seller/products/'+productId+'/variants',{method:'POST',body:JSON.stringify({...fields,status:'ACTIVE'})}) as {_id:string};
    id=created._id;
    onCreated(id);
  }
  await request('/seller/inventory/'+id,{method:'PATCH',body:JSON.stringify({
    available:payload.initialAvailable,expectedAvailable:row.id?row.originalAvailable:0,
    lowStockThreshold:payload.lowStockThreshold,
    note:row.id?'Seller cập nhật tồn kho từ Product Editor':'Tồn kho ban đầu của SKU mới',
  })});
  return id;
}
