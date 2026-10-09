import './globals.css';
import '../../../shared/image-uploader.css';
import { SessionLifecycle } from '../components/session-lifecycle';
export const metadata={title:'XIII ADMIN',description:'XIII marketplace administration'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="vi"><body><SessionLifecycle/>{children}</body></html>}
