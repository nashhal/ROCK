<?php
declare(strict_types=1);
require_once __DIR__ . '/../api/bootstrap.php';

rock_start_session();
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store, max-age=0');

function sales_fail(string $message, int $status = 400): never { rock_json(['error' => $message], $status); }
function sales_schema(PDO $pdo): void {
    static $ready = false;
    if ($ready) return;
    try {
        $repTable = $pdo->query("SHOW TABLES LIKE 'rock_sales_reps'")->fetchColumn();
        $lastTable = $pdo->query("SHOW TABLES LIKE 'rock_sales_stock_movements'")->fetchColumn();
        if ($repTable && $lastTable) { $ready = true; return; }
    } catch (Throwable $ignored) { /* Create missing sales tables below. */ }
    $sql = [
      "CREATE TABLE IF NOT EXISTS rock_sales_reps (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, username VARCHAR(40) NOT NULL UNIQUE,
        full_name VARCHAR(120) NOT NULL, phone VARCHAR(40) NOT NULL DEFAULT '',
        password_hash VARCHAR(255) NOT NULL, commission_percent DECIMAL(6,3) NULL DEFAULT NULL,
        active TINYINT(1) NOT NULL DEFAULT 1, last_login_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sales_rep_active (active,full_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
      "CREATE TABLE IF NOT EXISTS rock_sales_customers (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, rep_id BIGINT UNSIGNED NULL,
        full_name VARCHAR(160) NOT NULL, phone VARCHAR(40) NOT NULL, email VARCHAR(190) NOT NULL DEFAULT '',
        city VARCHAR(100) NOT NULL DEFAULT '', address VARCHAR(255) NOT NULL DEFAULT '', notes TEXT NOT NULL,
        created_by_role VARCHAR(20) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sales_customer_rep (rep_id,updated_at), INDEX idx_sales_customer_phone (phone), INDEX idx_sales_customer_name (full_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
      "CREATE TABLE IF NOT EXISTS rock_sales_documents (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, doc_no VARCHAR(32) NOT NULL UNIQUE,
        doc_type VARCHAR(16) NOT NULL, status VARCHAR(24) NOT NULL DEFAULT 'draft',
        payment_status VARCHAR(16) NOT NULL DEFAULT 'unpaid', customer_id BIGINT UNSIGNED NOT NULL,
        rep_id BIGINT UNSIGNED NULL, linked_quote_id BIGINT UNSIGNED NULL,
        subtotal DECIMAL(12,2) NOT NULL DEFAULT 0, discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0, notes TEXT NOT NULL, valid_until DATE NULL,
        commission_rate_snapshot DECIMAL(6,3) NULL, commission_amount_snapshot DECIMAL(12,2) NULL,
        commission_locked_at DATETIME NULL, stock_deducted_at DATETIME NULL,
        created_by_role VARCHAR(20) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sales_doc_rep (rep_id,doc_type,created_at), INDEX idx_sales_doc_status (doc_type,status,created_at),
        INDEX idx_sales_doc_customer (customer_id,created_at), INDEX idx_sales_doc_quote (linked_quote_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
      "CREATE TABLE IF NOT EXISTS rock_sales_document_items (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, document_id BIGINT UNSIGNED NOT NULL,
        product_id VARCHAR(80) NOT NULL, model_snapshot VARCHAR(120) NOT NULL, name_snapshot VARCHAR(255) NOT NULL,
        quantity INT UNSIGNED NOT NULL, unit_price DECIMAL(12,2) NOT NULL, line_total DECIMAL(12,2) NOT NULL,
        INDEX idx_sales_item_document (document_id), INDEX idx_sales_item_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
      "CREATE TABLE IF NOT EXISTS rock_sales_payments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, document_id BIGINT UNSIGNED NOT NULL,
        amount DECIMAL(12,2) NOT NULL, method VARCHAR(24) NOT NULL, reference VARCHAR(120) NOT NULL DEFAULT '',
        notes VARCHAR(500) NOT NULL DEFAULT '', paid_at DATETIME NOT NULL, created_by BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_sales_payment_document (document_id,paid_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
      "CREATE TABLE IF NOT EXISTS rock_sales_commissions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, order_id BIGINT UNSIGNED NOT NULL UNIQUE,
        rep_id BIGINT UNSIGNED NOT NULL, rate_snapshot DECIMAL(6,3) NOT NULL, basis_amount DECIMAL(12,2) NOT NULL,
        commission_amount DECIMAL(12,2) NOT NULL, locked_at DATETIME NOT NULL,
        INDEX idx_sales_commission_rep (rep_id,locked_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
      "CREATE TABLE IF NOT EXISTS rock_sales_activities (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, customer_id BIGINT UNSIGNED NOT NULL,
        document_id BIGINT UNSIGNED NULL, rep_id BIGINT UNSIGNED NULL, activity_type VARCHAR(24) NOT NULL,
        body TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sales_activity_customer (customer_id,created_at), INDEX idx_sales_activity_rep (rep_id,created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
      "CREATE TABLE IF NOT EXISTS rock_sales_settings (
        setting_key VARCHAR(80) NOT NULL PRIMARY KEY, setting_value VARCHAR(255) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
      "CREATE TABLE IF NOT EXISTS rock_sales_stock (
        product_id VARCHAR(80) NOT NULL PRIMARY KEY, is_tracked TINYINT(1) NOT NULL DEFAULT 0,
        quantity_on_hand INT UNSIGNED NOT NULL DEFAULT 0, reorder_level INT UNSIGNED NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
      "CREATE TABLE IF NOT EXISTS rock_sales_stock_movements (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, product_id VARCHAR(80) NOT NULL,
        document_id BIGINT UNSIGNED NULL, movement_type VARCHAR(20) NOT NULL, quantity INT NOT NULL,
        note VARCHAR(255) NOT NULL DEFAULT '', created_by BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_sales_stock_movement (product_id,created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ];
    foreach ($sql as $statement) $pdo->exec($statement);
    $q = $pdo->prepare('INSERT IGNORE INTO rock_sales_settings (setting_key,setting_value) VALUES (?,?)');
    $q->execute(['commission_default_percent','0']);
    $pdo->exec('INSERT IGNORE INTO rock_sales_stock (product_id) SELECT id FROM rock_products');
    $ready = true;
}
function sales_actor(PDO $pdo): ?array {
    if (!empty($_SESSION['rock_admin_id']) && !empty($_SESSION['rock_admin_username'])) {
        $q=$pdo->prepare('SELECT id,username FROM rock_admin_users WHERE id=? LIMIT 1');
        $q->execute([(int)$_SESSION['rock_admin_id']]); $r=$q->fetch();
        if (is_array($r)) return ['id'=>(int)$r['id'],'username'=>(string)$r['username'],'name'=>'مدير النظام','role'=>'admin'];
        unset($_SESSION['rock_admin_id'],$_SESSION['rock_admin_username']);
    }
    if (!empty($_SESSION['rock_sales_rep_id'])) {
        $q=$pdo->prepare('SELECT id,username,full_name,active FROM rock_sales_reps WHERE id=? LIMIT 1');
        $q->execute([(int)$_SESSION['rock_sales_rep_id']]); $r=$q->fetch();
        if (is_array($r) && (int)$r['active']===1) return ['id'=>(int)$r['id'],'username'=>(string)$r['username'],'name'=>(string)$r['full_name'],'role'=>'rep'];
        unset($_SESSION['rock_sales_rep_id']);
    }
    return null;
}
function sales_require(PDO $pdo, ?string $role=null): array {
    $a=sales_actor($pdo); if (!$a) sales_fail('سجّل الدخول للمتابعة.',401);
    if ($role!==null && $a['role']!==$role) sales_fail('ليست لديك صلاحية لتنفيذ هذه العملية.',403);
    return $a;
}
function sales_customer(PDO $pdo,array $actor,int $id): ?array {
    $sql='SELECT * FROM rock_sales_customers WHERE id=?'; $args=[$id];
    if ($actor['role']==='rep') {$sql.=' AND rep_id=?';$args[]=$actor['id'];}
    $q=$pdo->prepare($sql.' LIMIT 1');$q->execute($args);$r=$q->fetch();return is_array($r)?$r:null;
}
function sales_doc(PDO $pdo,array $actor,int $id): ?array {
    $sql="SELECT d.*,c.full_name customer_name,c.phone customer_phone,r.full_name rep_name
      FROM rock_sales_documents d JOIN rock_sales_customers c ON c.id=d.customer_id
      LEFT JOIN rock_sales_reps r ON r.id=d.rep_id WHERE d.id=?";
    $args=[$id];if($actor['role']==='rep'){$sql.=' AND d.rep_id=?';$args[]=$actor['id'];}
    $q=$pdo->prepare($sql.' LIMIT 1');$q->execute($args);$r=$q->fetch();return is_array($r)?$r:null;
}
function sales_doc_json(array $r,bool $admin): array {
    $v=['id'=>(int)$r['id'],'docNo'=>(string)$r['doc_no'],'type'=>(string)$r['doc_type'],'status'=>(string)$r['status'],
      'paymentStatus'=>(string)$r['payment_status'],'customerId'=>(int)$r['customer_id'],'customerName'=>(string)$r['customer_name'],
      'customerPhone'=>(string)$r['customer_phone'],'repId'=>$r['rep_id']===null?null:(int)$r['rep_id'],
      'repName'=>(string)($r['rep_name']??''),'total'=>(float)$r['total_amount'],'createdAt'=>(string)$r['created_at'],'notes'=>(string)$r['notes']];
    if($admin){$v['discount']=(float)$r['discount_amount'];$v['commissionRate']=$r['commission_rate_snapshot']===null?null:(float)$r['commission_rate_snapshot'];$v['commissionAmount']=$r['commission_amount_snapshot']===null?null:(float)$r['commission_amount_snapshot'];}
    return $v;
}
function sales_docs(PDO $pdo,array $actor,?string $type=null): array {
    $sql="SELECT d.*,c.full_name customer_name,c.phone customer_phone,r.full_name rep_name
      FROM rock_sales_documents d JOIN rock_sales_customers c ON c.id=d.customer_id
      LEFT JOIN rock_sales_reps r ON r.id=d.rep_id WHERE 1=1";$args=[];
    if($actor['role']==='rep'){$sql.=' AND d.rep_id=?';$args[]=$actor['id'];}
    if($type!==null){$sql.=' AND d.doc_type=?';$args[]=$type;}
    $sql.=' ORDER BY d.created_at DESC LIMIT 500';$q=$pdo->prepare($sql);$q->execute($args);
    return array_map(fn($r)=>sales_doc_json($r,$actor['role']==='admin'),$q->fetchAll());
}
function sales_doc_no(string $type): string { return ($type==='quote'?'QT':'SO').'-'.date('ymd').'-'.strtoupper(bin2hex(random_bytes(3))); }
function sales_log(PDO $pdo,int $customer,?int $doc,?int $rep,string $type,string $body): void {
    $q=$pdo->prepare('INSERT INTO rock_sales_activities (customer_id,document_id,rep_id,activity_type,body) VALUES (?,?,?,?,?)');
    $q->execute([$customer,$doc,$rep,$type,$body]);
}
function sales_payment_summary(PDO $pdo,int $docId): array {
    $q=$pdo->prepare('SELECT COALESCE(SUM(amount),0) FROM rock_sales_payments WHERE document_id=?');$q->execute([$docId]);
    return ['paid'=>(float)$q->fetchColumn()];
}
function sales_lock_commission(PDO $pdo,array $doc): void {
    if($doc['rep_id']===null || $doc['commission_locked_at']!==null)return;
    $q=$pdo->prepare('SELECT commission_percent FROM rock_sales_reps WHERE id=?');$q->execute([(int)$doc['rep_id']]);$override=$q->fetchColumn();
    $d=$pdo->prepare('SELECT setting_value FROM rock_sales_settings WHERE setting_key=?');$d->execute(['commission_default_percent']);
    $rate=$override===false||$override===null?(float)$d->fetchColumn():(float)$override;
    $basis=round((float)$doc['total_amount'],2);$amount=round($basis*$rate/100,2);$now=date('Y-m-d H:i:s');
    $pdo->prepare('INSERT INTO rock_sales_commissions (order_id,rep_id,rate_snapshot,basis_amount,commission_amount,locked_at) VALUES (?,?,?,?,?,?)')
      ->execute([(int)$doc['id'],(int)$doc['rep_id'],number_format($rate,3,'.',''),number_format($basis,2,'.',''),number_format($amount,2,'.',''),$now]);
    $pdo->prepare('UPDATE rock_sales_documents SET commission_rate_snapshot=?,commission_amount_snapshot=?,commission_locked_at=? WHERE id=?')
      ->execute([number_format($rate,3,'.',''),number_format($amount,2,'.',''),$now,(int)$doc['id']]);
}
function sales_lockout(PDO $pdo,string $hash): bool {
    $q=$pdo->prepare('SELECT locked_until FROM rock_login_attempts WHERE ip_hash=? LIMIT 1');$q->execute([$hash]);$until=$q->fetchColumn();
    return $until && strtotime((string)$until)>time();
}
function sales_failed_login(PDO $pdo,string $hash): void {
    $q=$pdo->prepare('SELECT attempts,first_attempt_at FROM rock_login_attempts WHERE ip_hash=? LIMIT 1');$q->execute([$hash]);$old=$q->fetch();
    $now=time();$first=is_array($old)?strtotime((string)$old['first_attempt_at']):false;
    $n=is_array($old)&&$first!==false&&($now-$first)<900?(int)$old['attempts']+1:1;
    $firstAt=$n===1?date('Y-m-d H:i:s'):(string)$old['first_attempt_at'];$locked=$n>=8?date('Y-m-d H:i:s',$now+900):null;
    $q=$pdo->prepare('INSERT INTO rock_login_attempts (ip_hash,attempts,first_attempt_at,locked_until) VALUES (?,?,?,?)
      ON DUPLICATE KEY UPDATE attempts=VALUES(attempts),first_attempt_at=VALUES(first_attempt_at),locked_until=VALUES(locked_until)');
    $q->execute([$hash,$n,$firstAt,$locked]);
}

if(!rock_is_configured()) sales_fail('تحتاج خدمة المبيعات إلى إعداد PHP/MySQL في api/config.php.',503);
try {
$pdo=rock_db();if(!rock_is_install_complete($pdo))sales_fail('ثبّت قاعدة بيانات ROCK من api/install.php أولًا.',503);
sales_schema($pdo);
$method=strtoupper((string)($_SERVER['REQUEST_METHOD']??'GET'));
$action=$method==='GET'?(string)($_GET['action']??'me'):(string)($_POST['action']??'');

if($method==='GET'&&$action==='me'){ $a=sales_actor($pdo);rock_json(['authenticated'=>$a!==null,'user'=>$a,'csrf'=>rock_csrf_token()]); }

if($method==='POST'&&$action==='login'){
 rock_check_csrf();$username=trim((string)($_POST['username']??''));$password=(string)($_POST['password']??'');
 global $ROCK_CONFIG;$ip=hash_hmac('sha256',(string)($_SERVER['REMOTE_ADDR']??'unknown'),(string)$ROCK_CONFIG['setup_token']);
 if(sales_lockout($pdo,$ip))sales_fail('تم إيقاف محاولات الدخول مؤقتًا. حاول بعد 15 دقيقة.',429);
 $q=$pdo->prepare('SELECT id,username,password_hash FROM rock_admin_users WHERE username=? LIMIT 1');$q->execute([$username]);$admin=$q->fetch();
 if(is_array($admin)&&password_verify($password,(string)$admin['password_hash'])){
  session_regenerate_id(true);unset($_SESSION['rock_sales_rep_id']);$_SESSION['rock_admin_id']=(int)$admin['id'];$_SESSION['rock_admin_username']=(string)$admin['username'];$_SESSION['rock_csrf']=bin2hex(random_bytes(32));
  $pdo->prepare('DELETE FROM rock_login_attempts WHERE ip_hash=?')->execute([$ip]);
  rock_json(['ok'=>true,'user'=>['id'=>(int)$admin['id'],'username'=>(string)$admin['username'],'name'=>'مدير النظام','role'=>'admin'],'csrf'=>$_SESSION['rock_csrf']]);
 }
 $q=$pdo->prepare('SELECT id,username,full_name,password_hash,active FROM rock_sales_reps WHERE username=? LIMIT 1');$q->execute([$username]);$rep=$q->fetch();
 if(is_array($rep)&&(int)$rep['active']===1&&password_verify($password,(string)$rep['password_hash'])){
  session_regenerate_id(true);unset($_SESSION['rock_admin_id'],$_SESSION['rock_admin_username']);$_SESSION['rock_sales_rep_id']=(int)$rep['id'];$_SESSION['rock_csrf']=bin2hex(random_bytes(32));
  $pdo->prepare('UPDATE rock_sales_reps SET last_login_at=NOW() WHERE id=?')->execute([(int)$rep['id']]);$pdo->prepare('DELETE FROM rock_login_attempts WHERE ip_hash=?')->execute([$ip]);
  rock_json(['ok'=>true,'user'=>['id'=>(int)$rep['id'],'username'=>(string)$rep['username'],'name'=>(string)$rep['full_name'],'role'=>'rep'],'csrf'=>$_SESSION['rock_csrf']]);
 }
 sales_failed_login($pdo,$ip);usleep(220000);sales_fail('بيانات الدخول غير صحيحة أو الحساب غير مفعّل.',401);
}
if($method==='POST'&&$action==='logout'){sales_require($pdo);rock_check_csrf();unset($_SESSION['rock_admin_id'],$_SESSION['rock_admin_username'],$_SESSION['rock_sales_rep_id']);session_regenerate_id(true);$_SESSION['rock_csrf']=bin2hex(random_bytes(32));rock_json(['ok'=>true]);}

$actor=sales_require($pdo);$admin=$actor['role']==='admin';
if($method==='GET'&&$action==='dashboard'){
 $where=$admin?'':' WHERE rep_id='.(int)$actor['id'];
 $q=$pdo->query('SELECT COUNT(*) FROM rock_sales_customers'.$where);$customers=(int)$q->fetchColumn();
 $scope=$admin?'':' AND rep_id='.(int)$actor['id'];
 $q=$pdo->query("SELECT COUNT(*) FROM rock_sales_documents WHERE doc_type='quote' AND status NOT IN ('converted','cancelled')".$scope);$quotes=(int)$q->fetchColumn();
 $q=$pdo->query("SELECT COUNT(*) FROM rock_sales_documents WHERE doc_type='order' AND status<>'cancelled'".$scope);$orders=(int)$q->fetchColumn();
 $q=$pdo->query("SELECT COALESCE(SUM(total_amount),0) FROM rock_sales_documents WHERE doc_type='order' AND status<>'cancelled'".$scope);$sales=(float)$q->fetchColumn();
 $paidSql="SELECT COALESCE(SUM(p.amount),0) FROM rock_sales_payments p JOIN rock_sales_documents d ON d.id=p.document_id WHERE d.doc_type='order' AND d.status<>'cancelled'".($admin?'':' AND d.rep_id='.(int)$actor['id']);
 $paid=(float)$pdo->query($paidSql)->fetchColumn();
 $recent=array_slice(sales_docs($pdo,$actor),0,8);$payload=['stats'=>['customers'=>$customers,'quotes'=>$quotes,'orders'=>$orders,'sales'=>$sales,'collected'=>$paid],'recent'=>$recent];
 if($admin)$payload['repPerformance']=$pdo->query("SELECT r.id,r.full_name,COUNT(d.id) order_count,COALESCE(SUM(CASE WHEN d.status<>'cancelled' THEN d.total_amount ELSE 0 END),0) sales FROM rock_sales_reps r LEFT JOIN rock_sales_documents d ON d.rep_id=r.id AND d.doc_type='order' WHERE r.active=1 GROUP BY r.id,r.full_name ORDER BY sales DESC LIMIT 10")->fetchAll();
 rock_json($payload);
}
if($method==='GET'&&$action==='products'){
 $rows=$pdo->query("SELECT p.id,p.model,p.barcode,p.name_ar,p.price,p.image,s.is_tracked,s.quantity_on_hand FROM rock_products p LEFT JOIN rock_sales_stock s ON s.product_id=p.id WHERE p.active=1 AND p.image_approved=1 ORDER BY p.sort_order,p.name_ar")->fetchAll();
 $items=[];foreach($rows as $r){$v=['id'=>(string)$r['id'],'model'=>(string)$r['model'],'barcode'=>(string)$r['barcode'],'name'=>(string)$r['name_ar'],'price'=>(float)$r['price'],'image'=>rock_safe_image_path((string)$r['image'])];$v['availability']=!(bool)$r['is_tracked']?'untracked':((int)$r['quantity_on_hand']>0?'available':'out');if($admin)$v['stock']=['tracked'=>(bool)$r['is_tracked'],'quantity'=>(int)$r['quantity_on_hand']];$items[]=$v;}
 rock_json(['products'=>$items]);
}
if($method==='GET'&&$action==='customers'){
 $sql="SELECT c.*,r.full_name rep_name FROM rock_sales_customers c LEFT JOIN rock_sales_reps r ON r.id=c.rep_id";if(!$admin)$sql.=' WHERE c.rep_id='.(int)$actor['id'];$sql.=' ORDER BY c.updated_at DESC LIMIT 500';
 $rows=$pdo->query($sql)->fetchAll();$out=array_map(fn($r)=>['id'=>(int)$r['id'],'name'=>(string)$r['full_name'],'phone'=>(string)$r['phone'],'email'=>(string)$r['email'],'city'=>(string)$r['city'],'address'=>(string)$r['address'],'notes'=>(string)$r['notes'],'repId'=>$r['rep_id']===null?null:(int)$r['rep_id'],'repName'=>(string)($r['rep_name']??''),'createdAt'=>(string)$r['created_at']],$rows);rock_json(['customers'=>$out]);
}
if($method==='GET'&&$action==='customer_detail'){
 $id=(int)($_GET['id']??0);$c=sales_customer($pdo,$actor,$id);if(!$c)sales_fail('العميل غير موجود أو ليس ضمن حسابك.',404);
 $q=$pdo->prepare("SELECT a.*,r.full_name rep_name FROM rock_sales_activities a LEFT JOIN rock_sales_reps r ON r.id=a.rep_id WHERE a.customer_id=? ORDER BY a.created_at DESC LIMIT 100");$q->execute([$id]);
 $activities=array_map(fn($r)=>['type'=>(string)$r['activity_type'],'typeLabel'=>(string)$r['activity_type'],'body'=>(string)$r['body'],'createdAt'=>(string)$r['created_at'],'repName'=>(string)($r['rep_name']??'')],$q->fetchAll());
 $docs=sales_docs($pdo,$actor);$docs=array_values(array_filter($docs,fn($d)=>$d['customerId']===$id));rock_json(['customerId'=>$id,'activities'=>$activities,'documents'=>$docs]);
}
if($method==='GET'&&$action==='documents'){$type=isset($_GET['type'])&&in_array($_GET['type'],['quote','order'],true)?(string)$_GET['type']:null;rock_json(['documents'=>sales_docs($pdo,$actor,$type)]);}
if($method==='GET'&&$action==='document_detail'){
 $id=(int)($_GET['id']??0);$d=sales_doc($pdo,$actor,$id);if(!$d)sales_fail('المستند غير موجود أو ليس ضمن حسابك.',404);
 $q=$pdo->prepare('SELECT * FROM rock_sales_document_items WHERE document_id=? ORDER BY id');$q->execute([$id]);$items=array_map(fn($r)=>['name'=>(string)$r['name_snapshot'],'model'=>(string)$r['model_snapshot'],'quantity'=>(int)$r['quantity'],'unitPrice'=>(float)$r['unit_price'],'lineTotal'=>(float)$r['line_total']],$q->fetchAll());
 $payments=[];if($d['doc_type']==='order'){$q=$pdo->prepare('SELECT * FROM rock_sales_payments WHERE document_id=? ORDER BY paid_at DESC');$q->execute([$id]);$payments=array_map(fn($r)=>['amount'=>(float)$r['amount'],'method'=>(string)$r['method'],'methodLabel'=>(string)$r['method'],'reference'=>(string)$r['reference'],'paidAt'=>(string)$r['paid_at']],$q->fetchAll());}
 rock_json(['document'=>sales_doc_json($d,$admin),'items'=>$items,'payments'=>$payments]);
}
if($method==='GET'&&$action==='reps'){
 sales_require($pdo,'admin');$rows=$pdo->query('SELECT id,username,full_name,phone,commission_percent,active,last_login_at FROM rock_sales_reps ORDER BY active DESC,full_name')->fetchAll();
 rock_json(['reps'=>array_map(fn($r)=>['id'=>(int)$r['id'],'username'=>(string)$r['username'],'name'=>(string)$r['full_name'],'phone'=>(string)$r['phone'],'commissionPercent'=>$r['commission_percent']===null?null:(float)$r['commission_percent'],'active'=>(bool)$r['active'],'lastLogin'=>(string)($r['last_login_at']??'')],$rows)]);
}
if($method==='GET'&&$action==='settings'){sales_require($pdo,'admin');$q=$pdo->prepare('SELECT setting_value FROM rock_sales_settings WHERE setting_key=?');$q->execute(['commission_default_percent']);rock_json(['defaultCommissionPercent'=>(float)$q->fetchColumn()]);}
if($method==='GET'&&$action==='commissions'){
 sales_require($pdo,'admin');$rows=$pdo->query("SELECT c.*,d.doc_no,r.full_name FROM rock_sales_commissions c JOIN rock_sales_documents d ON d.id=c.order_id JOIN rock_sales_reps r ON r.id=c.rep_id ORDER BY c.locked_at DESC LIMIT 500")->fetchAll();
 rock_json(['commissions'=>array_map(fn($r)=>['id'=>(int)$r['id'],'docNo'=>(string)$r['doc_no'],'repId'=>(int)$r['rep_id'],'repName'=>(string)$r['full_name'],'rate'=>(float)$r['rate_snapshot'],'basis'=>(float)$r['basis_amount'],'amount'=>(float)$r['commission_amount'],'lockedAt'=>(string)$r['locked_at']],$rows)]);
}
if($method==='GET'&&$action==='stock'){
 sales_require($pdo,'admin');$rows=$pdo->query("SELECT p.id,p.model,p.name_ar,s.is_tracked,s.quantity_on_hand,s.reorder_level FROM rock_products p LEFT JOIN rock_sales_stock s ON s.product_id=p.id WHERE p.active=1 ORDER BY p.name_ar")->fetchAll();
 rock_json(['stock'=>array_map(fn($r)=>['productId'=>(string)$r['id'],'model'=>(string)$r['model'],'name'=>(string)$r['name_ar'],'tracked'=>(bool)$r['is_tracked'],'quantity'=>(int)$r['quantity_on_hand'],'reorderLevel'=>(int)$r['reorder_level']],$rows)]);
}
if($method==='GET'&&$action==='report'){
 sales_require($pdo,'admin');$from=preg_match('/^\d{4}-\d{2}-\d{2}$/',(string)($_GET['from']??''))?(string)$_GET['from']:date('Y-m-01');$to=preg_match('/^\d{4}-\d{2}-\d{2}$/',(string)($_GET['to']??''))?(string)$_GET['to']:date('Y-m-d');
 $q=$pdo->prepare("SELECT r.id,r.full_name,COUNT(d.id) order_count,COALESCE(SUM(d.total_amount),0) sales,COALESCE(SUM((SELECT SUM(p.amount) FROM rock_sales_payments p WHERE p.document_id=d.id)),0) collected FROM rock_sales_reps r LEFT JOIN rock_sales_documents d ON d.rep_id=r.id AND d.doc_type='order' AND d.status<>'cancelled' AND DATE(d.created_at) BETWEEN ? AND ? GROUP BY r.id,r.full_name ORDER BY sales DESC");$q->execute([$from,$to]);rock_json(['from'=>$from,'to'=>$to,'rows'=>$q->fetchAll()]);
}
if($method==='GET'&&$action==='export_orders'){
 sales_require($pdo,'admin');$rows=$pdo->query("SELECT d.doc_no,d.created_at,d.status,d.payment_status,c.full_name customer,c.phone,r.full_name rep,d.total_amount,COALESCE((SELECT SUM(p.amount) FROM rock_sales_payments p WHERE p.document_id=d.id),0) collected FROM rock_sales_documents d JOIN rock_sales_customers c ON c.id=d.customer_id LEFT JOIN rock_sales_reps r ON r.id=d.rep_id WHERE d.doc_type='order' ORDER BY d.created_at DESC")->fetchAll();
 header('Content-Type: text/csv; charset=utf-8');header('Content-Disposition: attachment; filename="rock-sales-orders-'.date('Y-m-d').'.csv"');echo "\xEF\xBB\xBF";$o=fopen('php://output','w');fputcsv($o,['رقم الطلب','التاريخ','الحالة','التحصيل','العميل','الجوال','المندوب','الإجمالي','المحصّل']);foreach($rows as $r)fputcsv($o,[$r['doc_no'],$r['created_at'],$r['status'],$r['payment_status'],$r['customer'],$r['phone'],$r['rep'],$r['total_amount'],$r['collected']]);fclose($o);exit;
}
if($method!=='POST')sales_fail('الطريقة غير مدعومة.',405);
rock_check_csrf();

if($action==='save_customer'){
 $id=(int)($_POST['id']??0);$name=trim((string)($_POST['name']??''));$phone=trim((string)($_POST['phone']??''));$email=trim((string)($_POST['email']??''));$city=trim((string)($_POST['city']??''));$address=trim((string)($_POST['address']??''));$notes=trim((string)($_POST['notes']??''));
 if($name===''||mb_strlen($name)>160||$phone===''||mb_strlen($phone)>40)sales_fail('أدخل اسم العميل ورقم جواله بشكل صحيح.',422);
 if($email!==''&&!filter_var($email,FILTER_VALIDATE_EMAIL))sales_fail('البريد الإلكتروني غير صحيح.',422);
 $repId=$actor['role']==='rep'?$actor['id']:((int)($_POST['rep_id']??0)?:null);
 if($repId!==null){$q=$pdo->prepare('SELECT id FROM rock_sales_reps WHERE id=? AND active=1');$q->execute([$repId]);if(!$q->fetchColumn())sales_fail('المندوب المحدد غير متاح.',422);}
 $dup=$pdo->prepare('SELECT id FROM rock_sales_customers WHERE phone=? AND id<>? AND '.($repId===null?'rep_id IS NULL':'rep_id=?').' LIMIT 1');$args=[$phone,$id];if($repId!==null)$args[]=$repId;$dup->execute($args);$dupe=$dup->fetchColumn();if($dupe)sales_fail('يوجد عميل بهذا الرقم ضمن نفس حساب المندوب.',409);
 if($id>0){if(!sales_customer($pdo,$actor,$id))sales_fail('العميل غير موجود أو ليس ضمن حسابك.',404);$q=$pdo->prepare('UPDATE rock_sales_customers SET rep_id=?,full_name=?,phone=?,email=?,city=?,address=?,notes=? WHERE id=?');$q->execute([$repId,$name,$phone,$email,$city,$address,$notes,$id]);$customerId=$id;}
 else{$q=$pdo->prepare('INSERT INTO rock_sales_customers (rep_id,full_name,phone,email,city,address,notes,created_by_role) VALUES (?,?,?,?,?,?,?,?)');$q->execute([$repId,$name,$phone,$email,$city,$address,$notes,$actor['role']]);$customerId=(int)$pdo->lastInsertId();}
 if($notes!=='')sales_log($pdo,$customerId,null,$actor['role']==='rep'?$actor['id']:$repId,'note',$notes);rock_json(['ok'=>true,'id'=>$customerId]);
}
if($action==='save_rep'){
 sales_require($pdo,'admin');$id=(int)($_POST['id']??0);$username=trim((string)($_POST['username']??''));$name=trim((string)($_POST['name']??''));$phone=trim((string)($_POST['phone']??''));$password=(string)($_POST['password']??'');$rate=trim((string)($_POST['commission_percent']??''));$active=(string)($_POST['active']??'1')==='1';
 if(!preg_match('/^[A-Za-z0-9_.-]{3,40}$/',$username)||$name===''||mb_strlen($name)>120)sales_fail('تحقق من اسم المستخدم والاسم الكامل.',422);
 if($rate!==''&&(!is_numeric($rate)||(float)$rate<0||(float)$rate>100))sales_fail('نسبة العمولة يجب أن تكون بين 0 و100.',422);
 $rateValue=$rate===''?null:number_format((float)$rate,3,'.','');
 $q=$pdo->prepare('SELECT id FROM rock_admin_users WHERE username=?');$q->execute([$username]);if($q->fetchColumn())sales_fail('اسم المستخدم مستخدم للإدارة.',409);
 $q=$pdo->prepare('SELECT id FROM rock_sales_reps WHERE username=? AND id<>? LIMIT 1');$q->execute([$username,$id]);if($q->fetchColumn())sales_fail('اسم المستخدم مستخدم لمندوب آخر.',409);
 if($id>0){$q=$pdo->prepare('SELECT id FROM rock_sales_reps WHERE id=?');$q->execute([$id]);if(!$q->fetchColumn())sales_fail('المندوب غير موجود.',404);
  if($password!==''){if(strlen($password)<12)sales_fail('كلمة المرور لا تقل عن 12 حرفًا.',422);$q=$pdo->prepare('UPDATE rock_sales_reps SET username=?,full_name=?,phone=?,password_hash=?,commission_percent=?,active=? WHERE id=?');$q->execute([$username,$name,$phone,password_hash($password,PASSWORD_DEFAULT),$rateValue,$active?1:0,$id]);}
  else{$q=$pdo->prepare('UPDATE rock_sales_reps SET username=?,full_name=?,phone=?,commission_percent=?,active=? WHERE id=?');$q->execute([$username,$name,$phone,$rateValue,$active?1:0,$id]);}
 }else{if(strlen($password)<12)sales_fail('كلمة المرور الأولية لا تقل عن 12 حرفًا.',422);$q=$pdo->prepare('INSERT INTO rock_sales_reps (username,full_name,phone,password_hash,commission_percent,active) VALUES (?,?,?,?,?,?)');$q->execute([$username,$name,$phone,password_hash($password,PASSWORD_DEFAULT),$rateValue,$active?1:0]);}
 rock_json(['ok'=>true]);
}
if($action==='save_default_commission'){sales_require($pdo,'admin');$v=$_POST['percent']??'';if(!is_numeric($v)||(float)$v<0||(float)$v>100)sales_fail('أدخل نسبة صحيحة بين 0 و100.',422);$q=$pdo->prepare('INSERT INTO rock_sales_settings (setting_key,setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)');$q->execute(['commission_default_percent',number_format((float)$v,3,'.','')]);rock_json(['ok'=>true]);}
if($action==='save_stock'){
 sales_require($pdo,'admin');$id=trim((string)($_POST['product_id']??''));$tracked=(string)($_POST['tracked']??'0')==='1';$qty=filter_var($_POST['quantity']??null,FILTER_VALIDATE_INT);$reorder=filter_var($_POST['reorder_level']??0,FILTER_VALIDATE_INT);
 if($qty===false||$reorder===false||$qty<0||$reorder<0||$qty>10000000)sales_fail('تحقق من كمية المخزون وحد إعادة الطلب.',422);$q=$pdo->prepare('SELECT id FROM rock_products WHERE id=?');$q->execute([$id]);if(!$q->fetchColumn())sales_fail('المنتج غير موجود.',404);
 $pdo->beginTransaction();$q=$pdo->prepare('SELECT quantity_on_hand FROM rock_sales_stock WHERE product_id=? FOR UPDATE');$q->execute([$id]);$old=(int)$q->fetchColumn();$diff=$qty-$old;
 $q=$pdo->prepare('INSERT INTO rock_sales_stock (product_id,is_tracked,quantity_on_hand,reorder_level) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE is_tracked=VALUES(is_tracked),quantity_on_hand=VALUES(quantity_on_hand),reorder_level=VALUES(reorder_level)');$q->execute([$id,$tracked?1:0,$qty,$reorder]);
 if($diff!==0){$q=$pdo->prepare("INSERT INTO rock_sales_stock_movements (product_id,movement_type,quantity,note,created_by) VALUES (?,'adjustment',?,'تعديل رصيد من لوحة الإدارة',?)");$q->execute([$id,$diff,(int)$actor['id']]);}
 $pdo->commit();rock_json(['ok'=>true]);
}
if($action==='save_quote'){
 $customerId=(int)($_POST['customer_id']??0);$customer=sales_customer($pdo,$actor,$customerId);if(!$customer)sales_fail('اختر عميلًا من قائمة حسابك.',422);
 $items=json_decode((string)($_POST['items']??'[]'),true);if(!is_array($items)||count($items)<1||count($items)>30)sales_fail('أضف منتجًا واحدًا على الأقل وبحد أقصى 30.',422);
 $repId=$actor['role']==='rep'?$actor['id']:((int)($_POST['rep_id']??0)?:null);if($admin&&$repId!==null){$q=$pdo->prepare('SELECT id FROM rock_sales_reps WHERE id=? AND active=1');$q->execute([$repId]);if(!$q->fetchColumn())sales_fail('المندوب المحدد غير متاح.',422);}
 $discount=(float)($_POST['discount']??0);if(!$admin&&$discount>0)sales_fail('الخصم يحتاج اعتماد الإدارة.',403);if($discount<0||$discount>1000000)sales_fail('قيمة الخصم غير صحيحة.',422);
 $valid=trim((string)($_POST['valid_until']??''));if($valid!==''&&(!preg_match('/^\d{4}-\d{2}-\d{2}$/',$valid)||$valid<date('Y-m-d')))sales_fail('تاريخ صلاحية العرض يجب أن يكون اليوم أو تاريخًا مستقبليًا.',422);
 $notes=trim((string)($_POST['notes']??''));$lines=[];$subtotal=0.0;
 foreach($items as $item){if(!is_array($item))continue;$pid=trim((string)($item['product_id']??''));$qty=filter_var($item['quantity']??null,FILTER_VALIDATE_INT);if($qty===false||$qty<1||$qty>10000)sales_fail('الكمية يجب أن تكون رقمًا صحيحًا موجبًا.',422);
  $q=$pdo->prepare('SELECT id,model,name_ar,price FROM rock_products WHERE id=? AND active=1 AND image_approved=1 LIMIT 1');$q->execute([$pid]);$p=$q->fetch();if(!is_array($p))sales_fail('أحد المنتجات لم يعد متاحًا في الكتالوج.',422);
  $line=round((float)$p['price']*$qty,2);$subtotal+=$line;$lines[]=['id'=>$pid,'model'=>(string)$p['model'],'name'=>(string)$p['name_ar'],'qty'=>$qty,'price'=>(float)$p['price'],'line'=>$line];
 }
 if(!$lines||$discount>$subtotal)sales_fail('تحقق من المنتجات أو قيمة الخصم.',422);$total=round($subtotal-$discount,2);if($total<=0)sales_fail('يجب أن يكون إجمالي العرض أكبر من صفر.',422);$no=sales_doc_no('quote');
 $pdo->beginTransaction();$q=$pdo->prepare("INSERT INTO rock_sales_documents (doc_no,doc_type,status,customer_id,rep_id,subtotal,discount_amount,total_amount,notes,valid_until,created_by_role) VALUES (?,'quote','draft',?,?,?,?,?,?,?,?)");
 $q->execute([$no,$customerId,$repId,number_format($subtotal,2,'.',''),number_format($discount,2,'.',''),number_format($total,2,'.',''),$notes,$valid?:null,$actor['role']]);$docId=(int)$pdo->lastInsertId();
 $q=$pdo->prepare('INSERT INTO rock_sales_document_items (document_id,product_id,model_snapshot,name_snapshot,quantity,unit_price,line_total) VALUES (?,?,?,?,?,?,?)');foreach($lines as $l)$q->execute([$docId,$l['id'],$l['model'],$l['name'],$l['qty'],number_format($l['price'],2,'.',''),number_format($l['line'],2,'.','')]);
 sales_log($pdo,$customerId,$docId,$repId,'quote','تم إنشاء عرض السعر '.$no);$pdo->commit();rock_json(['ok'=>true,'id'=>$docId,'docNo'=>$no]);
}
if($action==='send_quote'){
 $id=(int)($_POST['id']??0);$d=sales_doc($pdo,$actor,$id);if(!$d||$d['doc_type']!=='quote')sales_fail('عرض السعر غير موجود.',404);
 if(!in_array($d['status'],['draft','sent'],true))sales_fail('لا يمكن إرسال العرض في حالته الحالية.',409);
 if((float)$d['discount_amount']>0&&!$admin)sales_fail('العرض الذي يتضمن خصمًا يحتاج اعتماد الإدارة.',403);
 $pdo->prepare("UPDATE rock_sales_documents SET status='sent' WHERE id=?")->execute([$id]);sales_log($pdo,(int)$d['customer_id'],$id,$d['rep_id']===null?null:(int)$d['rep_id'],'quote','تم تسجيل إرسال عرض السعر '.$d['doc_no']);rock_json(['ok'=>true]);
}
if($action==='convert_quote'){
 sales_require($pdo,'admin');$id=(int)($_POST['id']??0);$pdo->beginTransaction();
 $q=$pdo->prepare("SELECT * FROM rock_sales_documents WHERE id=? AND doc_type='quote' FOR UPDATE");$q->execute([$id]);$quote=$q->fetch();
 if(!is_array($quote)||!in_array($quote['status'],['sent','draft'],true)){ $pdo->rollBack();sales_fail('لا يمكن تحويل هذا العرض؛ تحقق من حالته.',409);}
 if($quote['valid_until']!==null && $quote['valid_until']<date('Y-m-d')){$pdo->rollBack();sales_fail('انتهت صلاحية عرض السعر.',409);}
 $q=$pdo->prepare('SELECT * FROM rock_sales_document_items WHERE document_id=?');$q->execute([$id]);$items=$q->fetchAll();if(!$items){$pdo->rollBack();sales_fail('العرض لا يحتوي على منتجات.',409);}
 $no=sales_doc_no('order');$q=$pdo->prepare("INSERT INTO rock_sales_documents (doc_no,doc_type,status,payment_status,customer_id,rep_id,linked_quote_id,subtotal,discount_amount,total_amount,notes,created_by_role) VALUES (?,'order','confirmed','unpaid',?,?,?,?,?,?,?,?)");
 $q->execute([$no,(int)$quote['customer_id'],$quote['rep_id'],$id,$quote['subtotal'],$quote['discount_amount'],$quote['total_amount'],$quote['notes'],$actor['role']]);$orderId=(int)$pdo->lastInsertId();
 $q=$pdo->prepare('INSERT INTO rock_sales_document_items (document_id,product_id,model_snapshot,name_snapshot,quantity,unit_price,line_total) VALUES (?,?,?,?,?,?,?)');
 foreach($items as $l)$q->execute([$orderId,$l['product_id'],$l['model_snapshot'],$l['name_snapshot'],$l['quantity'],$l['unit_price'],$l['line_total']]);
 $pdo->prepare("UPDATE rock_sales_documents SET status='converted' WHERE id=?")->execute([$id]);sales_log($pdo,(int)$quote['customer_id'],$orderId,$quote['rep_id']===null?null:(int)$quote['rep_id'],'order','تم اعتماد العرض وتحويله إلى طلب '.$no);$pdo->commit();rock_json(['ok'=>true,'orderNo'=>$no]);
}
if($action==='update_order_status'){
 sales_require($pdo,'admin');$id=(int)($_POST['id']??0);$status=(string)($_POST['status']??'');$allowed=['confirmed','preparing','shipped','delivered','cancelled'];if(!in_array($status,$allowed,true))sales_fail('حالة الطلب غير معروفة.',422);
 $pdo->beginTransaction();$q=$pdo->prepare("SELECT * FROM rock_sales_documents WHERE id=? AND doc_type='order' FOR UPDATE");$q->execute([$id]);$d=$q->fetch();if(!is_array($d)){$pdo->rollBack();sales_fail('الطلب غير موجود.',404);}
 $transitions=['confirmed'=>['confirmed','preparing','shipped','cancelled'],'preparing'=>['preparing','shipped','cancelled'],'shipped'=>['shipped','delivered'],'delivered'=>['delivered'],'cancelled'=>['cancelled']];
 if(!in_array($status,$transitions[(string)$d['status']]??[],true)){$pdo->rollBack();sales_fail('لا يمكن نقل الطلب إلى هذه الحالة من مرحلته الحالية.',409);}
 if($status==='cancelled'&&$d['stock_deducted_at']!==null){$pdo->rollBack();sales_fail('تم شحن الطلب بالفعل. سجّل حركة مرتجع مخزون بشكل مستقل قبل أي تسوية.',409);}
 if($status==='shipped'&&$d['stock_deducted_at']===null){
  $q=$pdo->prepare('SELECT product_id,quantity FROM rock_sales_document_items WHERE document_id=?');$q->execute([$id]);$lines=$q->fetchAll();
  foreach($lines as $line){$q=$pdo->prepare('SELECT is_tracked,quantity_on_hand FROM rock_sales_stock WHERE product_id=? FOR UPDATE');$q->execute([$line['product_id']]);$stock=$q->fetch();if(is_array($stock)&&(int)$stock['is_tracked']===1){if((int)$stock['quantity_on_hand']<(int)$line['quantity']){$pdo->rollBack();sales_fail('المخزون غير كافٍ للمنتج '.$line['product_id'].'.',409);}$pdo->prepare('UPDATE rock_sales_stock SET quantity_on_hand=quantity_on_hand-? WHERE product_id=?')->execute([(int)$line['quantity'],$line['product_id']]);$pdo->prepare("INSERT INTO rock_sales_stock_movements (product_id,document_id,movement_type,quantity,note,created_by) VALUES (?,?, 'sale',?,'خصم مخزون عند الشحن',?)")->execute([$line['product_id'],$id,-(int)$line['quantity'],(int)$actor['id']]);}}
  $pdo->prepare('UPDATE rock_sales_documents SET stock_deducted_at=NOW() WHERE id=?')->execute([$id]);
 }
 $pdo->prepare('UPDATE rock_sales_documents SET status=? WHERE id=?')->execute([$status,$id]);sales_log($pdo,(int)$d['customer_id'],$id,$d['rep_id']===null?null:(int)$d['rep_id'],'status','تم تحديث حالة الطلب إلى '.$status);$pdo->commit();rock_json(['ok'=>true]);
}
if($action==='record_payment'){
 sales_require($pdo,'admin');$id=(int)($_POST['id']??0);$amount=filter_var($_POST['amount']??null,FILTER_VALIDATE_FLOAT);$method=(string)($_POST['method']??'bank_transfer');$ref=trim((string)($_POST['reference']??''));$notes=trim((string)($_POST['notes']??''));
 if($amount===false||$amount<=0||$amount>100000000)sales_fail('أدخل مبلغ تحصيل صحيحًا.',422);if(!in_array($method,['cash','bank_transfer','card','other'],true))sales_fail('طريقة التحصيل غير صحيحة.',422);
 $pdo->beginTransaction();$q=$pdo->prepare("SELECT * FROM rock_sales_documents WHERE id=? AND doc_type='order' FOR UPDATE");$q->execute([$id]);$d=$q->fetch();if(!is_array($d)||$d['status']==='cancelled'){$pdo->rollBack();sales_fail('الطلب غير موجود أو ملغي.',404);}
 $q=$pdo->prepare('SELECT COALESCE(SUM(amount),0) FROM rock_sales_payments WHERE document_id=?');$q->execute([$id]);$paid=(float)$q->fetchColumn();$remaining=max(0,round((float)$d['total_amount']-$paid,2));if($amount>$remaining+0.001){$pdo->rollBack();sales_fail('المبلغ يتجاوز الرصيد المتبقي ('.number_format($remaining,2).' ر.س).',422);}
 $q=$pdo->prepare('INSERT INTO rock_sales_payments (document_id,amount,method,reference,notes,paid_at,created_by) VALUES (?,?,?,?,?,NOW(),?)');$q->execute([$id,number_format((float)$amount,2,'.',''),$method,$ref,$notes,(int)$actor['id']]);
 $total=round($paid+(float)$amount,2);$full=$total+0.001>=(float)$d['total_amount'];$pdo->prepare('UPDATE rock_sales_documents SET payment_status=? WHERE id=?')->execute([$full?'paid':'partial',$id]);if($full)sales_lock_commission($pdo,$d);
 sales_log($pdo,(int)$d['customer_id'],$id,$d['rep_id']===null?null:(int)$d['rep_id'],'payment','تم تسجيل دفعة بقيمة '.number_format((float)$amount,2).' ر.س');$pdo->commit();rock_json(['ok'=>true,'paid'=>$total,'remaining'=>max(0,round((float)$d['total_amount']-$total,2)),'paymentStatus'=>$full?'paid':'partial']);
}
if($action==='add_activity'){
 $id=(int)($_POST['customer_id']??0);if(!sales_customer($pdo,$actor,$id))sales_fail('العميل غير موجود أو ليس ضمن حسابك.',404);$type=(string)($_POST['type']??'note');$body=trim((string)($_POST['body']??''));if(!in_array($type,['note','call','visit','email','whatsapp','task'],true)||$body===''||mb_strlen($body)>4000)sales_fail('أدخل نشاطًا صحيحًا.',422);sales_log($pdo,$id,null,$actor['role']==='rep'?$actor['id']:null,$type,$body);rock_json(['ok'=>true]);
}
sales_fail('العملية غير معروفة.',404);
} catch(Throwable $e) {
 if(isset($pdo)&&$pdo instanceof PDO&&$pdo->inTransaction())$pdo->rollBack();
 error_log('[ROCK sales] '.$e->getMessage());
 sales_fail('تعذر إتمام العملية. تحقق من إعداد قاعدة البيانات ثم أعد المحاولة.',500);
}