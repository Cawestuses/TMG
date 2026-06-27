/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/src/components/Layout";
import { Home } from "@/src/pages/Home";
import { Downloads } from "@/src/pages/Downloads";
import { News } from "@/src/pages/News";
import { FAQ } from "@/src/pages/FAQ";
import { Staff } from "@/src/pages/Staff";
import { Admin } from "@/src/pages/Admin";
import "@/src/i18n/config";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/news" element={<News />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Layout>
    </Router>
  );
}
