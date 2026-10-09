import './globals.css';
import '../../../shared/image-uploader.css';
import './street.css';
import './button-feedback.css';
import './fluid-ui.css';
import './liquid-glass.css';
import { StreetMotion } from '../components/street-motion';
import { SessionLifecycle } from '../components/session-lifecycle';
export const metadata={title:{default:'XIII — Wear your own way',template:'%s | XIII'},description:'Khám phá local brand, thời trang và phong cách của riêng bạn cùng XIII.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="vi"><body id="top"><StreetMotion><SessionLifecycle/>{children}</StreetMotion></body></html>}
