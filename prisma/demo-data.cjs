// Demonstration data only. Run inside the local backend container from /app.
const path=require('node:path');
const root=path.resolve(__dirname,'..');
require('dotenv').config({path:path.join(root,'.env')});
if(process.env.NODE_ENV==='production')throw Error('Los datos Demo solo se cargan en desarrollo.');
const {prisma}=require(path.join(root,'dist/lib/prisma'));
const service = name => require(path.join(root,`dist/modules/${name}/${name}.service`));
const {randomUUID}=require('node:crypto');
const tag='HUASKAR_DEMO_20261014';
const now=new Date();
const day=(offset,hour=12)=>{const d=new Date(now.getTime()-offset*86400000); d.setUTCHours(hour+5,0,0,0); return d;};
const future=days=>new Date(now.getTime()+days*86400000).toISOString();
const catalog=[
 ['Abarrotes',[['Arroz extra 1 kg',4.5],['Azúcar rubia 1 kg',4],['Aceite vegetal 1 L',9.5],['Fideos spaghetti 500 g',3.5],['Lentejas 500 g',4.8]]],
 ['Bebidas',[['Agua mineral 625 ml',2],['Gaseosa cola 1.5 L',7.5],['Jugo de naranja 1 L',6],['Bebida rehidratante 500 ml',3.8],['Agua con gas 500 ml',2.5]]],
 ['Lácteos',[['Leche evaporada 400 g',4.5],['Yogur de fresa 1 L',8.5],['Queso fresco 250 g',9],['Mantequilla 100 g',5.5],['Leche fresca 1 L',6.5]]],
 ['Panadería',[['Pan de molde 500 g',7.5],['Tostadas integrales 200 g',5],['Bizcocho de vainilla 250 g',6.5],['Galletas de avena 180 g',4],['Pan integral 450 g',8]]],
 ['Snacks',[['Papas fritas 150 g',5.5],['Chocolate de leche 40 g',3],['Maní tostado 100 g',3.5],['Galletas saladas 100 g',2.5],['Barra de cereal 30 g',2]]],
 ['Limpieza',[['Detergente 800 g',10.5],['Lejía 1 L',4],['Lavavajilla 500 g',6],['Limpiador de piso 900 ml',7],['Esponja de cocina 3 unidades',3.5]]],
 ['Higiene',[['Jabón de tocador 125 g',3],['Papel higiénico 4 rollos',7.5],['Pasta dental 90 g',6.5],['Champú 350 ml',15],['Cepillo dental',5]]],
 ['Conservas',[['Atún en aceite 170 g',7],['Sardinas en tomate 155 g',5.5],['Duraznos en almíbar 820 g',12],['Maíz dulce 300 g',5],['Frijoles cocidos 400 g',6.5]]],
 ['Congelados',[['Hamburguesas 4 unidades',14],['Nuggets de pollo 400 g',16],['Verduras mixtas 500 g',8],['Helado de vainilla 1 L',18],['Papas para freír 1 kg',12]]],
 ['Desayunos',[['Avena 500 g',5],['Café molido 200 g',14],['Té filtrante 25 sobres',4.5],['Mermelada de fresa 250 g',6],['Cereal de maíz 300 g',9.5]]]
];
async function main(){
 if(await prisma.auditLog.findFirst({where:{entity:'DEMO_DATASET',entityId:tag,action:'COMPLETE'}})){console.log('Este conjunto de demostración ya fue cargado. No se duplicó.');return;}
 // Refuse unsafe reruns after partial transaction histories; preserve every existing record.
 if(await prisma.product.count({where:{code:{startsWith:'DEMO-'}}}))throw Error('Carga previa parcial detectada; revisar antes de volver a ejecutar.');
 const users=await prisma.user.findMany({where:{role:{in:['ADMIN','CAJERO']}},orderBy:{id:'asc'}});
 const warehouse=await prisma.user.findFirst({where:{role:'ALMACEN'}});
 if(!warehouse||!users.some(u=>u.role==='ADMIN'))throw Error('Faltan los usuarios de los roles necesarios.');
 if(await prisma.cashRegisterSession.count({where:{status:'OPEN',openedById:{in:users.map(u=>u.id)}}}))throw Error('Hay cajas abiertas existentes; no se modificarán.');
 const products=[],suppliers=[],customers=[];
 for(const [categoryName,items] of catalog){
  const category=await service('category').createCategory({name:`${categoryName} (Demo)`});
  for(const [name,price] of items){const n=products.length+1; const p=await service('product').createProduct({code:`DEMO-${String(n).padStart(3,'0')}`,name:`${name} (Demo)`,price,costPrice:Number((price*.62).toFixed(2)),stock:0,minStock:10,maxStock:200,categoryId:category.id});products.push(p);}
 }
 for(let n=0;n<10;n++)suppliers.push(await service('supplier').createSupplier({name:`Distribuidora ${catalog[n][0]} (Demo)`,ruc:`20999000${String(n+1).padStart(3,'0')}`,contact:`Contacto ficticio ${n+1}`,phone:'000000000',address:'Dirección ficticia de demostración - Cusco'}));
 for(let n=0;n<25;n++)customers.push(await service('customer').createCustomer({name:`Cliente Demo ${String(n+1).padStart(2,'0')}`,address:'Dirección ficticia de demostración - Cusco'}));
 console.log('Catálogo: 10 categorías, 50 productos, 10 proveedores y 25 clientes.');
 for(let n=0;n<14;n++){
  const start=(n%10)*5;
  const order=await service('purchase').createPurchaseOrder({supplierId:suppliers[n%10].id,items:products.slice(start,start+5).map((p,i)=>({productId:p.id,quantity:80+i*5,unitPrice:p.costPrice,expirationDate:future(n===2?8+i*3:120+n*10+i)}))});
  if(n<10)await service('purchase').receivePurchaseOrder(order.id,warehouse.id);
  if(n>=12)await service('purchase').cancelPurchaseOrder(order.id);
  if(n<10){await prisma.purchaseOrder.update({where:{id:order.id},data:{createdAt:day(9,8),receivedAt:day(8,9)}});await prisma.productBatch.updateMany({where:{purchaseOrderId:order.id},data:{receivedAt:day(8,9)}});}
 }
 await prisma.inventoryMovement.updateMany({where:{productId:{in:products.map(p=>p.id)},movementType:'PURCHASE'},data:{createdAt:day(8,9)}});
 let salesCount=0,cancelledCount=0;
 // Seven days of simulated operations for every existing administrator/cashier.
 for(let offset=6;offset>=0;offset--){
  for(let u=0;u<users.length;u++){
   const user=users[u],session=await service('cashregister').openSession(user.id,{openingAmount:150,notes:`${tag}: jornada ficticia de demostración`});
   await service('cashregister').addCashMovement(session.id,user.id,{kind:'income',amount:20,reason:'Demo: ingreso adicional de efectivo'});
   await service('cashregister').addCashMovement(session.id,user.id,{kind:'expense',amount:8,reason:'Demo: gasto menor de caja'});
   for(let k=0;k<3;k++){
    const index=(offset*7+u*3+k*11)%50;
    const items=[0,5,13].map((shift,i)=>({productId:products[(index+shift)%50].id,quantity:1+((offset+u+k+i)%3)}));
    const customer=customers[(offset*3+u+k)%customers.length];
    const isInvoice=(offset+u+k)%5===0;
    const sale=await service('sale').createSale({requestId:randomUUID(),receiptType:isInvoice?'factura':'boleta',customerId:customer.id,customerName:customer.name,...(isInvoice?{customerDocType:'ruc',customerDocNumber:'20999999999'}:{}),items,paymentMethod:['cash','card','yape','plin'][(u+offset+k)%4],discount:k===2?1:0},user.id);
    const date=new Date(day(offset,9).getTime()+(u*20+k*4)*60000);
    const cancelled=k===2&&offset===4;
    if(cancelled){await service('sale').cancelSale(sale.id,users.find(a=>a.role==='ADMIN').id);cancelledCount++;}
    await prisma.sale.update({where:{id:sale.id},data:{createdAt:date,...(cancelled?{cancelledAt:new Date(date.getTime()+60000)}:{})}});
    await prisma.inventoryMovement.updateMany({where:{referenceId:sale.id},data:{createdAt:date}});
    salesCount++;
   }
   const active=await service('cashregister').getActiveSession(user.id);
   await service('cashregister').closeSession(session.id,user.id,{closingAmount:active.expectedAmount,notes:`${tag}: caja ficticia cerrada y cuadrada`});
   await prisma.cashRegisterSession.update({where:{id:session.id},data:{openedAt:day(offset,8),closedAt:day(offset,11)}});
   await prisma.cashMovement.updateMany({where:{sessionId:session.id},data:{createdAt:day(offset,9)}});
  }
  console.log(`Jornada demo -${offset} días completada.`);
 }
 // Low-stock cases and regular stock corrections for the warehouse interface.
 for(let i=0;i<8;i++){
  const p=await prisma.product.findUnique({where:{id:products[i].id}});
  const quantity=i<5?(3+i-p.stock):5;
  if(quantity)await service('inventory').createMovement({productId:p.id,movementType:'adjustment',quantity,reason:i<5?'Demo: ajuste para mostrar alerta de stock bajo':'Demo: corrección de conteo físico'},warehouse.id);
 }
 for(const user of users)await service('cashregister').openSession(user.id,{openingAmount:150,notes:`${tag}: caja de prueba disponible para nuevas ventas`});
 await prisma.auditLog.create({data:{userId:users[0].id,userName:users[0].email,action:'COMPLETE',entity:'DEMO_DATASET',entityId:tag,details:JSON.stringify({label:'Datos ficticios solicitados por el usuario; no son operaciones reales',salesCount,cancelledCount})}});
 const totals={};for(const t of ['category','product','supplier','customer','purchaseOrder','sale','productBatch','inventoryMovement','cashRegisterSession','cashMovement'])totals[t]=await prisma[t].count();
 console.log(JSON.stringify({totals,salesCount,cancelledCount},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());

