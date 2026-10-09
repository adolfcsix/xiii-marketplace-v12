import Link from 'next/link';
import { SiteHeader } from '../../components/site-header';
export default function Help(){return <><SiteHeader/><main className="home-shell help-page"><div className="collection-heading"><span>HERE TO HELP / XIII</span><h1>Mua sắm dễ dàng hơn.</h1><p>Những câu trả lời bạn cần, ngay tại đây.</p></div>{[
 ['Làm sao chọn đúng sản phẩm?','Mở chi tiết sản phẩm, chọn màu, kích thước và số lượng còn hàng trước khi thêm vào giỏ.'],
 ['Theo dõi đơn hàng ở đâu?','Đăng nhập và mở Tài khoản → Đơn mua để xem tiến trình và chi tiết đơn hàng.'],
 ['Tôi có thể trao đổi với shop không?','Dùng nút Chat với shop tại trang sản phẩm. Các cuộc trò chuyện được lưu trong mục Tin nhắn.'],
 ['Danh sách yêu thích lưu ở đâu?','Nhấn trái tim để lưu sản phẩm. Danh sách lưu trên trình duyệt hiện tại, không đồng bộ sang thiết bị khác.'],
 ['Cần trả hàng hoặc hoàn tiền?','Mở đơn hàng để xem các thao tác đang được hỗ trợ, hoặc vào Tài khoản → Trả hàng & hoàn tiền.'],
].map(([q,a])=><details key={q} className="help-question"><summary>{q}</summary><p>{a}</p></details>)}<Link className="cart-primary-link" href="/account/orders">Xem đơn mua →</Link></main></>}
