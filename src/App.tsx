import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import RoutersPage from '@/pages/RoutersPage';
import RouterDetailPage from '@/pages/RouterDetailPage';
import TopologyPage from '@/pages/TopologyPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<RoutersPage />} />
          <Route path="router/:id" element={<RouterDetailPage />} />
          <Route path="topology" element={<TopologyPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
