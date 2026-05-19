import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import RoutersPage from '@/pages/RoutersPage';
import RouterDetailPage from '@/pages/RouterDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<RoutersPage />} />
          <Route path="router/:id" element={<RouterDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
