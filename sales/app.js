(() => {
'use strict';
const $ = (s,r=document) => r.querySelector(s);
const $$ = (s,r=document) => Array.from(r.querySelectorAll(s));
const state = {user:null,csrf:'',customers:[],products:[],quotes:[],orders:[],reps:[],stock:[],commissions:[],detail:null};
const money = n => new Intl.NumberFormat('ar-SA',{style:'currency',currency:'SAR',maximumFractionDigits:2}).format(Number(n||0));
const esc = v => String(v===null||v===undefined?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateFmt = v => {if(!v)return '—';const d=new Date(String(v).replace(' ','T'));return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat('ar-SA',{year:'numeric',month:'short',day:'numeric'}).format(d);};
const labelStatus = v => ({draft:'مسودة',sent:'مرسل للعميل',converted:'تحوّل إلى طلب',confirmed:'معتمد',preparing:'قيد التجهيز',shipped:'تم الشحن',delivered:'تم التسليم',cancelled:'ملغي',unpaid:'غير محصّل',partial:'تحصيل جزئي',paid:'مدفوع بالكامل'}[v]||v||'—');
const clsStatus = v => ['paid','delivered','converted'].includes(v)?'green':['sent','confirmed','preparing','partial'].includes(v)?'blue':['shipped'].includes(v)?'amber':['cancelled','unpaid'].includes(v)?'red':'';
function toast(msg){const e=$('#toast');e.textContent=msg;e.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.classList.remove('show'),3000);}
function message(el,msg,ok){if(!el)return;el.textContent=msg||'';el.classList.toggle('success',!!ok);}
function formData(form){return Object.fromEntries(new FormData(form).entries());}
async function api(action,data,method){
 method=method||'GET';const url=new URL('api.php',document.baseURI);const opt={method:method,credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}};
 if(method==='GET'){url.searchParams.set('action',action);Object.keys(data||{}).forEach(k=>{if(data[k]!==''&&data[k]!==null&&data[k]!==undefined)url.searchParams.set(k,String(data[k]));});}
 else{const body=new URLSearchParams();body.set('action',action);body.set('csrf',state.csrf);Object.keys(data||{}).forEach(k=>body.set(k,typeof data[k]==='string'?data[k]:String(data[k]===undefined?'':data[k])));opt.headers['Content-Type']='application/x-www-form-urlencoded;charset=UTF-8';opt.body=body;}
 const res=await fetch(url,opt);const ct=(res.headers.get('content-type')||'').toLowerCase();if(!ct.includes('application/json'))throw new Error('خدمة المبيعات غير مهيأة. يلزم إعداد PHP/MySQL وملف api/config.php على الاستضافة.');
 const p=await res.json();if(!res.ok)throw new Error(p.error||'تعذّر تنفيذ العملية.');if(p.csrf)state.csrf=p.csrf;return p;
}
function openTab(tab){
 if(['reps','stock','commissions','reports'].includes(tab)&&state.user.role!=='admin')return;
 $$('.tab-panel').forEach(e=>e.classList.toggle('active',e.id==='tab-'+tab));$$('.nav-link').forEach(e=>e.classList.toggle('active',e.dataset.tab===tab));
 const names={dashboard:'نظرة عامة',customers:'العملاء',quotes:'عروض الأسعار',orders:'الطلبات',reps:'إدارة المندوبين',stock:'المخزون',commissions:'العمولات',reports:'التقارير'};$('#currentSection').textContent=names[tab]||'ROCK';$('#sidebar').classList.remove('open');
 if(tab==='reports')loadReport().catch(e=>toast(e.message));
}
function showApp(user){
 state.user=user;$('#loginView').hidden=true;$('#appView').hidden=false;
 $('#userName').textContent=user.name||user.username;$('#userRole').textContent=user.role==='admin'?'مدير النظام':'مندوب مبيعات';$('#userAvatar').textContent=(user.name||user.username).trim().charAt(0).toUpperCase();$('#greetingName').textContent=user.name||'فريق ROCK';
 $$('.admin-only').forEach(e=>e.hidden=user.role!=='admin');
 $('#todayLabel').textContent=new Intl.DateTimeFormat('ar-SA',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
 const now=new Date();$('#reportForm [name="from"]').value=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10);$('#reportForm [name="to"]').value=now.toISOString().slice(0,10);
 openTab('dashboard');refreshAll().catch(e=>toast(e.message));
}
async function init(){try{const p=await api('me');state.csrf=p.csrf||'';if(p.authenticated&&p.user){showApp(p.user);return;}}catch(e){message($('#loginMessage'),e.message);}$('#loginView').hidden=false;$('#appView').hidden=true;}
async function refreshAll(){
 const jobs=[loadDashboard(),loadCustomers(),loadProducts(),loadDocuments()];
 if(state.user.role==='admin')jobs.push(loadReps(),loadStock(),loadCommissions(),loadSettings());
 const results=await Promise.allSettled(jobs);const fail=results.find(x=>x.status==='rejected');if(fail)throw fail.reason;
}
async function loadDashboard(){
 const p=await api('dashboard');$('#statCustomers').textContent=p.stats.customers;$('#statQuotes').textContent=p.stats.quotes;$('#statOrders').textContent=p.stats.orders;$('#statSales').textContent=money(p.stats.sales);$('#statCollected').textContent=money(p.stats.collected);$('#customerNavCount').textContent=p.stats.customers;
 const docs=p.recent||[];$('#recentDocuments').innerHTML=docs.length?docs.map(d=>'<div class="recent-row"><div class="recent-main"><strong>'+esc(d.docNo)+'</strong><span>'+esc(d.customerName)+' · '+(d.type==='quote'?'عرض سعر':'طلب')+'</span></div><div class="recent-side"><b>'+money(d.total)+'</b><small>'+esc(labelStatus(d.status))+'</small></div></div>').join(''):'<p class="muted">لا توجد حركة مسجلة بعد.</p>';
 if(state.user.role==='admin'){const reps=p.repPerformance||[];const max=Math.max(1,...reps.map(r=>Number(r.sales)));$('#repPerformance').innerHTML=reps.length?reps.map((r,i)=>'<div class="performance-row"><span class="performance-rank">'+(i+1)+'</span><div><div class="performance-name">'+esc(r.full_name)+'</div><div class="performance-bar"><span style="width:'+Math.min(100,Number(r.sales)/max*100)+'%"></span></div></div><b class="performance-sales">'+money(r.sales)+'</b></div>').join(''):'<p class="muted">لا توجد بيانات للمندوبين بعد.</p>';}
}
async function loadCustomers(){const p=await api('customers');state.customers=p.customers||[];renderCustomers();fillCustomerSelects();}
async function loadProducts(){const p=await api('products');state.products=p.products||[];if(!$('#quoteLines').children.length)addQuoteLine();}
async function loadDocuments(){const a=await api('documents',{type:'quote'});const b=await api('documents',{type:'order'});state.quotes=a.documents||[];state.orders=b.documents||[];renderQuotes();renderOrders();}
async function loadReps(){const p=await api('reps');state.reps=p.reps||[];renderReps();fillRepSelects();}
async function loadStock(){const p=await api('stock');state.stock=p.stock||[];renderStock();}
async function loadCommissions(){const p=await api('commissions');state.commissions=p.commissions||[];renderCommissions();}
async function loadSettings(){const p=await api('settings');$('#defaultCommission').value=Number(p.defaultCommissionPercent||0);}
function fillCustomerSelects(){const html=state.customers.map(c=>'<option value="'+c.id+'">'+esc(c.name)+' — '+esc(c.phone)+'</option>').join('');const el=$('#quoteCustomer');const old=el.value;el.innerHTML='<option value="">اختر العميل</option>'+html;if(old)el.value=old;}
function fillRepSelects(){const html=state.reps.filter(r=>r.active).map(r=>'<option value="'+r.id+'">'+esc(r.name)+'</option>').join('');['#customerRepSelect','#quoteRep'].forEach(sel=>{const el=$(sel);if(el){const old=el.value;el.innerHTML='<option value="">بدون تعيين</option>'+html;if(old)el.value=old;}});}
function person(name,sub){return '<div class="person-cell"><span class="person-dot">'+esc((name||'?').trim().charAt(0))+'</span><span><strong>'+esc(name)+'</strong>'+(sub?'<small>'+esc(sub)+'</small>':'')+'</span></div>';}
function renderCustomers(){
 const q=$('#customerSearch').value.trim().toLowerCase();const rows=state.customers.filter(c=>[c.name,c.phone,c.city].join(' ').toLowerCase().includes(q));$('#customerCountLabel').textContent=rows.length+' عميل';$('#customersEmpty').hidden=rows.length>0;
 $('#customersBody').innerHTML=rows.map(c=>'<tr><td>'+person(c.name,c.email)+'</td><td dir="ltr">'+esc(c.phone)+'</td><td>'+esc(c.city||'—')+'</td>'+(state.user.role==='admin'?'<td>'+esc(c.repName||'غير معيّن')+'</td>':'')+'<td>'+dateFmt(c.createdAt)+'</td><td><div class="table-actions"><button class="small-action primary" data-customer-view="'+c.id+'">الملف</button><button class="icon-action" data-customer-edit="'+c.id+'" aria-label="تعديل">✎</button></div></td></tr>').join('');
}
function renderQuotes(){
 const q=$('#quoteSearch').value.trim().toLowerCase();const rows=state.quotes.filter(d=>[d.docNo,d.customerName,d.repName].join(' ').toLowerCase().includes(q));$('#quotesEmpty').hidden=rows.length>0;
 $('#quotesBody').innerHTML=rows.map(d=>'<tr><td><strong dir="ltr">'+esc(d.docNo)+'</strong></td><td>'+esc(d.customerName)+'<small dir="ltr">'+esc(d.customerPhone)+'</small></td>'+(state.user.role==='admin'?'<td>'+esc(d.repName||'—')+'</td>':'')+'<td><strong>'+money(d.total)+'</strong></td><td><span class="status '+clsStatus(d.status)+'">'+esc(labelStatus(d.status))+'</span></td><td>'+dateFmt(d.createdAt)+'</td><td><div class="table-actions"><button class="small-action primary" data-doc-view="'+d.id+'" data-doc-type="quote">تفاصيل</button>'+(d.status==='draft'?'<button class="small-action" data-quote-send="'+d.id+'">إرسال</button>':'')+(state.user.role==='admin'&&['sent','draft'].includes(d.status)?'<button class="small-action" data-quote-convert="'+d.id+'">اعتماد</button>':'')+'</div></td></tr>').join('');
}
function renderOrders(){
 const q=$('#orderSearch').value.trim().toLowerCase();const rows=state.orders.filter(d=>[d.docNo,d.customerName,d.repName].join(' ').toLowerCase().includes(q));$('#ordersEmpty').hidden=rows.length>0;
 const opts=['confirmed','preparing','shipped','delivered','cancelled'];
 $('#ordersBody').innerHTML=rows.map(d=>'<tr><td><strong dir="ltr">'+esc(d.docNo)+'</strong><small>'+dateFmt(d.createdAt)+'</small></td><td>'+esc(d.customerName)+'<small dir="ltr">'+esc(d.customerPhone)+'</small></td>'+(state.user.role==='admin'?'<td>'+esc(d.repName||'—')+'</td>':'')+'<td><strong>'+money(d.total)+'</strong></td><td><span class="status '+clsStatus(d.status)+'">'+esc(labelStatus(d.status))+'</span></td><td><span class="status '+clsStatus(d.paymentStatus)+'">'+esc(labelStatus(d.paymentStatus))+'</span></td><td><div class="table-actions"><button class="small-action primary" data-doc-view="'+d.id+'" data-doc-type="order">تفاصيل</button>'+(state.user.role==='admin'&&d.paymentStatus!=='paid'&&d.status!=='cancelled'?'<button class="small-action" data-payment="'+d.id+'">تحصيل</button>':'')+(state.user.role==='admin'&&d.status!=='cancelled'?'<select class="order-status-select" data-order-status="'+d.id+'" aria-label="حالة الطلب">'+opts.map(s=>'<option value="'+s+'" '+(s===d.status?'selected':'')+'>'+labelStatus(s)+'</option>').join('')+'</select>':'')+'</div></td></tr>').join('');
}
function renderReps(){
 $('#repsBody').innerHTML=state.reps.map(r=>'<tr><td>'+person(r.name,r.phone)+'</td><td dir="ltr">'+esc(r.username)+'</td><td dir="ltr">'+esc(r.phone||'—')+'</td><td>'+(r.commissionPercent===null?'النسبة العامة':Number(r.commissionPercent).toFixed(3).replace(/\.?0+$/,'')+'%')+'</td><td><span class="status '+(r.active?'green':'red')+'">'+(r.active?'مفعّل':'موقوف')+'</span></td><td>'+(r.lastLogin?dateFmt(r.lastLogin):'لم يسجل الدخول')+'</td><td><button class="small-action" data-rep-edit="'+r.id+'">تعديل</button></td></tr>').join('');
}
function renderStock(){const q=$('#stockSearch').value.toLowerCase();const rows=state.stock.filter(p=>[p.name,p.model].join(' ').toLowerCase().includes(q));$('#stockBody').innerHTML=rows.map(p=>'<tr data-stock-row="'+esc(p.productId)+'"><td><strong>'+esc(p.name)+'</strong></td><td dir="ltr">'+esc(p.model)+'</td><td><select data-stock-tracked><option value="0" '+(!p.tracked?'selected':'')+'>غير متتبّع</option><option value="1" '+(p.tracked?'selected':'')+'>تتبّع الكمية</option></select></td><td><input data-stock-qty type="number" min="0" max="10000000" value="'+p.quantity+'" style="width:85px"></td><td><input data-stock-reorder type="number" min="0" max="10000000" value="'+p.reorderLevel+'" style="width:85px"></td><td><button class="small-action primary" data-stock-save="'+esc(p.productId)+'">حفظ</button></td></tr>').join('');}
function renderCommissions(){$('#commissionsEmpty').hidden=state.commissions.length>0;$('#commissionsBody').innerHTML=state.commissions.map(c=>'<tr><td dir="ltr"><strong>'+esc(c.docNo)+'</strong></td><td>'+esc(c.repName)+'</td><td>'+money(c.basis)+'</td><td>'+Number(c.rate).toFixed(3).replace(/\.?0+$/,'')+'%</td><td><strong>'+money(c.amount)+'</strong></td><td>'+dateFmt(c.lockedAt)+'</td></tr>').join('');}
function addQuoteLine(){
 const row=document.createElement('div');row.className='quote-line';const options=state.products.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.model)+' — '+esc(p.name)+' ('+money(p.price)+')</option>').join('');
 row.innerHTML='<select class="line-product" aria-label="المنتج" required><option value="">اختر المنتج</option>'+options+'</select><input class="line-qty" type="number" min="1" max="10000" value="1" aria-label="الكمية" required><span class="quote-line-total">0.00</span><button type="button" class="remove-line" aria-label="حذف البند">×</button>';$('#quoteLines').append(row);calcQuote();
}
function calcQuote(){
 let sum=0;$$('.quote-line',$('#quoteLines')).forEach(row=>{const p=state.products.find(x=>x.id===$('.line-product',row).value);const qty=Math.max(0,Number($('.line-qty',row).value)||0);const total=p?p.price*qty:0;sum+=total;$('.quote-line-total',row).textContent=total.toFixed(2);});
 const discount=state.user.role==='admin'?Math.max(0,Number($('#quoteForm [name="discount"]').value)||0):0;$('#quoteTotal').textContent=money(Math.max(0,sum-discount));
}
function openForm(id){const e=$(id);e.hidden=false;e.scrollIntoView({behavior:'smooth',block:'center'});}
function hideForm(id){$(id).hidden=true;}
async function refreshAll(){
 const jobs=[loadDashboard(),loadCustomers(),loadProducts(),loadDocuments()];
 if(state.user.role==='admin')jobs.push(loadReps(),loadStock(),loadCommissions(),loadSettings());
 const results=await Promise.allSettled(jobs);const fail=results.find(x=>x.status==='rejected');if(fail)throw fail.reason;
}
async function loadReport(){const from=$('#reportForm [name="from"]').value,to=$('#reportForm [name="to"]').value;if(!from||!to||from>to)throw new Error('تحقق من فترة التقرير.');const p=await api('report',{from:from,to:to});$('#reportPeriod').textContent=dateFmt(p.from)+' — '+dateFmt(p.to);$('#reportsBody').innerHTML=(p.rows||[]).map(r=>{const pct=Number(r.sales)>0?Number(r.collected)/Number(r.sales)*100:0;return '<tr><td><strong>'+esc(r.full_name)+'</strong></td><td>'+Number(r.order_count)+'</td><td>'+money(r.sales)+'</td><td>'+money(r.collected)+'</td><td>'+pct.toFixed(1)+'%</td></tr>';}).join('');}
async function showCustomerDetail(id){
 const c=state.customers.find(x=>x.id===Number(id));if(!c)return;const p=await api('customer_detail',{id:c.id});state.detail={kind:'customer',id:c.id};const a=p.activities||[],d=p.documents||[];
 $('#detailTitle').textContent=c.name;$('#detailContent').innerHTML='<div class="detail-summary"><div class="detail-tile"><span>رقم الجوال</span><strong dir="ltr">'+esc(c.phone)+'</strong></div><div class="detail-tile"><span>المدينة</span><strong>'+esc(c.city||'—')+'</strong></div><div class="detail-tile"><span>المندوب</span><strong>'+esc(c.repName||'—')+'</strong></div></div><p><b>البريد:</b> '+esc(c.email||'—')+'　<b>العنوان:</b> '+esc(c.address||'—')+'</p><p><b>ملاحظات:</b> '+esc(c.notes||'لا توجد')+'</p><h3>سجل النشاط</h3><div class="activity-list">'+(a.length?a.map(x=>'<div class="activity-item"><small>'+esc(x.typeLabel)+' · '+dateFmt(x.createdAt)+'</small><p>'+esc(x.body)+'</p></div>').join(''):'<p>لا يوجد نشاط مسجل.</p>')+'</div><form id="activityForm" class="activity-form"><input type="hidden" name="customer_id" value="'+c.id+'"><select name="type"><option value="note">ملاحظة</option><option value="call">مكالمة</option><option value="visit">زيارة</option><option value="whatsapp">واتساب</option><option value="email">بريد</option><option value="task">متابعة</option></select><input name="body" required maxlength="4000" placeholder="سجل نتيجة التواصل أو الخطوة القادمة"><button class="primary-btn" type="submit">إضافة</button></form><h3>المستندات المرتبطة</h3><div class="activity-list">'+(d.length?d.map(x=>'<div class="activity-item"><small>'+(x.type==='quote'?'عرض سعر':'طلب')+' · '+esc(labelStatus(x.status))+'</small><p><b dir="ltr">'+esc(x.docNo)+'</b> — '+money(x.total)+'</p></div>').join(''):'<p>لا توجد مستندات.</p>')+'</div>';
 $('#detailModal').hidden=false;
}
async function showDocumentDetail(id,type){
 const p=await api('document_detail',{id:id});const d=p.document;if(!d)throw new Error('المستند غير موجود.');state.detail={kind:'document',id:d.id,type:type};$('#detailTitle').textContent=d.docNo;const lines=p.items||[],payments=p.payments||[];
 let html='<div class="detail-summary"><div class="detail-tile"><span>العميل</span><strong>'+esc(d.customerName)+'</strong></div><div class="detail-tile"><span>الجوال</span><strong dir="ltr">'+esc(d.customerPhone)+'</strong></div><div class="detail-tile"><span>الحالة</span><strong>'+esc(labelStatus(d.status))+'</strong></div><div class="detail-tile"><span>التاريخ</span><strong>'+dateFmt(d.createdAt)+'</strong></div><div class="detail-tile"><span>المندوب</span><strong>'+esc(d.repName||'—')+'</strong></div><div class="detail-tile"><span>التحصيل</span><strong>'+esc(labelStatus(d.paymentStatus))+'</strong></div></div><div class="table-scroll"><table class="detail-lines"><thead><tr><th>المنتج</th><th>الكمية</th><th>الوحدة</th><th>الإجمالي</th></tr></thead><tbody>'+lines.map(l=>'<tr><td>'+esc(l.name)+'<small dir="ltr">'+esc(l.model)+'</small></td><td>'+l.quantity+'</td><td>'+money(l.unitPrice)+'</td><td>'+money(l.lineTotal)+'</td></tr>').join('')+'</tbody></table></div><div class="detail-total">الإجمالي: '+money(d.total)+'</div>';
 if(d.notes)html+='<p><b>ملاحظات:</b> '+esc(d.notes)+'</p>';
 if(type==='order'){html+='<h3>سجل التحصيل</h3><div class="activity-list">'+(payments.length?payments.map(x=>'<div class="activity-item"><small>'+dateFmt(x.paidAt)+' · '+esc(x.methodLabel)+'</small><p>'+money(x.amount)+(x.reference?' · '+esc(x.reference):'')+'</p></div>').join(''):'<p>لا توجد دفعات مسجلة.</p>')+'</div>';}
 html+='<div class="detail-actions"><button class="secondary-btn" type="button" id="printDetail">طباعة / PDF</button><button class="secondary-btn" type="button" id="copyDetail">نسخ الملخص</button>';
 if(type==='quote'&&d.status==='draft')html+='<button class="primary-btn" type="button" id="modalSendQuote">تسجيل الإرسال</button>';
 if(type==='quote'&&state.user.role==='admin'&&['draft','sent'].includes(d.status))html+='<button class="primary-btn" type="button" id="modalConvertQuote">اعتماد كطلب</button>';
 if(type==='order'&&state.user.role==='admin'&&d.paymentStatus!=='paid'&&d.status!=='cancelled')html+='<button class="primary-btn" type="button" id="togglePayment">تسجيل دفعة</button>';
 html+='</div><form id="paymentForm" class="payment-form" hidden><label>المبلغ (ر.س)<input name="amount" type="number" min="0.01" step="0.01" required></label><label>طريقة الدفع<select name="method"><option value="bank_transfer">تحويل بنكي</option><option value="cash">نقدًا</option><option value="card">بطاقة</option><option value="other">أخرى</option></select></label><label>مرجع الدفعة<input name="reference" maxlength="120"></label><label>ملاحظات<input name="notes" maxlength="500"></label><div class="form-actions"><button class="primary-btn" type="submit">حفظ الدفعة</button><span id="paymentMessage" class="form-message"></span></div></form>';
 $('#detailContent').innerHTML=html;$('#detailModal').hidden=false;
}
function closeModal(){$('#detailModal').hidden=true;state.detail=null;}
async function refreshAfter(action,data,msg){const p=await api(action,data,'POST');await refreshAll();if(msg)toast(msg);return p;}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();try{const p=await api('login',formData(e.currentTarget),'POST');state.csrf=p.csrf||state.csrf;showApp(p.user);}catch(err){message($('#loginMessage'),err.message);}});
$('#logoutBtn').addEventListener('click',async()=>{try{await api('logout',{},'POST');state.user=null;$('#loginView').hidden=false;$('#appView').hidden=true;message($('#loginMessage'),'تم تسجيل الخروج.',true);}catch(e){toast(e.message);}});
$$('.nav-link').forEach(b=>b.addEventListener('click',()=>openTab(b.dataset.tab)));
$$('[data-open-tab]').forEach(b=>b.addEventListener('click',()=>openTab(b.dataset.openTab)));
$$('[data-hide]').forEach(b=>b.addEventListener('click',()=>hideForm(b.dataset.hide)));
$('#mobileMenuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
$('#showCustomerForm').addEventListener('click',()=>{$('#customerForm').reset();$('#customerForm [name="id"]').value='';openForm('#customerFormCard');});
$('#showQuoteForm').addEventListener('click',()=>{if(!state.customers.length){toast('أضف العميل أولًا.');openTab('customers');openForm('#customerFormCard');return;}$('#quoteForm').reset();$('#quoteLines').innerHTML='';addQuoteLine();openForm('#quoteFormCard');});
$('#showRepForm').addEventListener('click',()=>{$('#repForm').reset();$('#repForm [name="id"]').value='';$('#repForm [name="active"]').checked=true;openForm('#repFormCard');});
$('#addQuoteLine').addEventListener('click',addQuoteLine);
$('#quoteLines').addEventListener('input',calcQuote);$('#quoteLines').addEventListener('change',calcQuote);
$('#quoteLines').addEventListener('click',e=>{if(e.target.closest('.remove-line')){e.target.closest('.quote-line').remove();if(!$('#quoteLines').children.length)addQuoteLine();calcQuote();}});
$('#quoteForm [name="discount"]').addEventListener('input',calcQuote);
$('#customerForm').addEventListener('submit',async e=>{e.preventDefault();try{await refreshAfter('save_customer',formData(e.currentTarget),'تم حفظ بيانات العميل.');hideForm('#customerFormCard');e.currentTarget.reset();}catch(err){message($('#customerMessage'),err.message);}});
$('#quoteForm').addEventListener('submit',async e=>{e.preventDefault();const items=$$('.quote-line',$('#quoteLines')).map(r=>({product_id:$('.line-product',r).value,quantity:Number($('.line-qty',r).value)}));if(items.some(x=>!x.product_id||!Number.isInteger(x.quantity)||x.quantity<1)){message($('#quoteMessage'),'أكمل اختيار المنتج والكمية لكل بند.');return;}const d=formData(e.currentTarget);d.items=JSON.stringify(items);try{const p=await api('save_quote',d,'POST');await refreshAll();hideForm('#quoteFormCard');e.currentTarget.reset();$('#quoteLines').innerHTML='';addQuoteLine();toast('تم إنشاء عرض السعر '+p.docNo);}catch(err){message($('#quoteMessage'),err.message);}});
$('#repForm').addEventListener('submit',async e=>{e.preventDefault();const d=formData(e.currentTarget);d.active=$('#repForm [name="active"]').checked?'1':'0';try{await refreshAfter('save_rep',d,'تم حفظ حساب المندوب.');hideForm('#repFormCard');e.currentTarget.reset();}catch(err){message($('#repMessage'),err.message);}});
$('#commissionForm').addEventListener('submit',async e=>{e.preventDefault();try{await api('save_default_commission',{percent:$('#defaultCommission').value},'POST');message($('#commissionMessage'),'تم حفظ النسبة العامة.',true);toast('تم حفظ إعداد العمولة.');}catch(err){message($('#commissionMessage'),err.message);}});
$('#customerSearch').addEventListener('input',renderCustomers);$('#quoteSearch').addEventListener('input',renderQuotes);$('#orderSearch').addEventListener('input',renderOrders);$('#stockSearch').addEventListener('input',renderStock);
$('#refreshButton')?.addEventListener('click',()=>refreshAll().then(()=>toast('تم تحديث البيانات.')).catch(e=>toast(e.message)));
$('#reportForm').addEventListener('submit',e=>{e.preventDefault();loadReport().catch(x=>toast(x.message));});
$$('[data-close-modal]').forEach(e=>e.addEventListener('click',closeModal));
$('#customersBody').addEventListener('click',async e=>{const v=e.target.closest('[data-customer-view]'),ed=e.target.closest('[data-customer-edit]');try{if(v)await showCustomerDetail(v.dataset.customerView);if(ed){const c=state.customers.find(x=>x.id===Number(ed.dataset.customerEdit));const f=$('#customerForm');['id','name','phone','email','city','address','notes','rep_id'].forEach(k=>{if(f.elements[k])f.elements[k].value=k==='id'?c.id:k==='rep_id'?(c.repId||''):c[k]||'';});openForm('#customerFormCard');}}catch(x){toast(x.message);}});
$('#detailContent').addEventListener('submit',async e=>{if(e.target.id==='activityForm'){e.preventDefault();try{const d=formData(e.target);await api('add_activity',d,'POST');await refreshAll();await showCustomerDetail(d.customer_id);toast('تم تسجيل النشاط.');}catch(x){toast(x.message);}}
 if(e.target.id==='paymentForm'){e.preventDefault();const d=formData(e.target);d.id=state.detail.id;try{await api('record_payment',d,'POST');await refreshAll();await showDocumentDetail(d.id,'order');toast('تم تسجيل الدفعة.');}catch(x){message($('#paymentMessage'),x.message);}}});
$('#quotesBody').addEventListener('click',async e=>{const v=e.target.closest('[data-doc-view]'),s=e.target.closest('[data-quote-send]'),c=e.target.closest('[data-quote-convert]');try{if(v)await showDocumentDetail(v.dataset.docView,'quote');if(s)await refreshAfter('send_quote',{id:s.dataset.quoteSend},'تم تسجيل إرسال العرض.');if(c){const p=await refreshAfter('convert_quote',{id:c.dataset.quoteConvert},'تم اعتماد الطلب.');toast('رقم الطلب '+p.orderNo);}}catch(x){toast(x.message);}});
$('#ordersBody').addEventListener('click',async e=>{const v=e.target.closest('[data-doc-view]'),p=e.target.closest('[data-payment]');try{if(v)await showDocumentDetail(v.dataset.docView,'order');if(p)await showDocumentDetail(p.dataset.payment,'order').then(()=>{$('#paymentForm').hidden=false;});}catch(x){toast(x.message);}});
$('#ordersBody').addEventListener('change',async e=>{const s=e.target.closest('[data-order-status]');if(!s)return;try{await refreshAfter('update_order_status',{id:s.dataset.orderStatus,status:s.value},'تم تحديث حالة الطلب.');}catch(x){toast(x.message);await loadDocuments();}});
$('#repsBody').addEventListener('click',e=>{const b=e.target.closest('[data-rep-edit]');if(!b)return;const r=state.reps.find(x=>x.id===Number(b.dataset.repEdit));const f=$('#repForm');['id','name','username','phone','commission_percent'].forEach(k=>{if(f.elements[k])f.elements[k].value=k==='id'?r.id:k==='commission_percent'?(r.commissionPercent===null?'':r.commissionPercent):r[k==='name'?'name':k]||'';});f.elements.active.checked=r.active;f.elements.password.value='';openForm('#repFormCard');});
$('#stockBody').addEventListener('click',async e=>{const b=e.target.closest('[data-stock-save]');if(!b)return;const row=b.closest('[data-stock-row]');try{await api('save_stock',{product_id:b.dataset.stockSave,tracked:row.querySelector('[data-stock-tracked]').value,quantity:row.querySelector('[data-stock-qty]').value,reorder_level:row.querySelector('[data-stock-reorder]').value},'POST');await loadStock();toast('تم تحديث المخزون.');}catch(x){toast(x.message);}});
$('#detailContent').addEventListener('click',async e=>{
 if(e.target.id==='printDetail'){window.print();return;}
 if(e.target.id==='togglePayment'){$('#paymentForm').hidden=false;return;}
 if(e.target.id==='printDetail')window.print();
 if(e.target.id==='copyDetail'){try{const d=await api('document_detail',{id:state.detail.id});const lines=d.items.map(x=>x.name+' × '+x.quantity+' = '+money(x.lineTotal)).join('\n');await navigator.clipboard.writeText('ROCK '+d.document.docNo+'\n'+d.document.customerName+'\n'+lines+'\nالإجمالي: '+money(d.document.total));toast('تم نسخ الملخص.');}catch(x){toast('تعذّر النسخ.');}}
 if(e.target.id==='modalSendQuote'){const id=state.detail.id;try{await refreshAfter('send_quote',{id:id},'تم تسجيل الإرسال.');await showDocumentDetail(id,'quote');}catch(x){toast(x.message);}}
 if(e.target.id==='modalConvertQuote'){const id=state.detail.id;try{const p=await refreshAfter('convert_quote',{id:id},'تم تحويل العرض إلى طلب.');closeModal();toast('رقم الطلب '+p.orderNo);}catch(x){toast(x.message);}}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();$('#sidebar').classList.remove('open');}});
init();
})();