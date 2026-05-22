/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Home } from "./pages/Home";
import { RegisteredProjects } from "./pages/projects/RegisteredProjects";
import { ProjectList } from "./pages/projects/ProjectList";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { CategoryList } from "./pages/admin/CategoryList";
import { ExemptPersonnelList } from "./pages/admin/ExemptPersonnelList";
import { ReducedPersonnelList } from "./pages/admin/ReducedPersonnelList";
import { StudentProfile } from "./pages/student/StudentProfile";
import { ProjectEdit } from "./pages/projects/ProjectEdit";
import { ProjectDetail } from "./pages/projects/ProjectDetail";
import { SelectProject } from "./pages/checkin/SelectProject";
import { FaceScan } from "./pages/checkin/FaceScan";
import { RegisterMode } from "./pages/checkin/RegisterMode";
import { AllRecords } from "./pages/records/AllRecords";
import { StatsOverview } from "./pages/stats/StatsOverview";
import { StatsGlobal } from "./pages/stats/StatsGlobal";
import { StatsGrade } from "./pages/stats/StatsGrade";
import { StatsClass } from "./pages/stats/StatsClass";
import { StatsProject } from "./pages/stats/StatsProject";
import { StatsProjectDetail } from "./pages/stats/StatsProjectDetail";
import { Layout } from "./components/Layout";
import { TopLevelGuard } from "./components/TopLevelGuard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/registered" element={<RegisteredProjects />} />
          <Route
            path="/admin"
            element={
              <TopLevelGuard>
                <AdminDashboard />
              </TopLevelGuard>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <TopLevelGuard>
                <CategoryList />
              </TopLevelGuard>
            }
          />
          <Route
            path="/admin/projects"
            element={
              <TopLevelGuard>
                <ProjectList />
              </TopLevelGuard>
            }
          />
          <Route
            path="/admin/exempt-personnel"
            element={
              <TopLevelGuard>
                <ExemptPersonnelList />
              </TopLevelGuard>
            }
          />
          <Route
            path="/admin/reduced-personnel"
            element={
              <TopLevelGuard>
                <ReducedPersonnelList />
              </TopLevelGuard>
            }
          />
          <Route path="/projects" element={<Navigate to="/admin" replace />} />
          <Route
            path="/projects/new"
            element={
              <TopLevelGuard>
                <ProjectEdit />
              </TopLevelGuard>
            }
          />
          <Route
            path="/projects/edit/:id"
            element={
              <TopLevelGuard>
                <ProjectEdit />
              </TopLevelGuard>
            }
          />
          <Route path="/projects/:id" element={<ProjectDetail />} />

          <Route path="/checkin/select" element={<SelectProject />} />
          <Route path="/checkin/face-scan/:projectId" element={<FaceScan />} />
          <Route
            path="/checkin/register/:projectId"
            element={<RegisterMode />}
          />

          <Route path="/stats" element={<StatsOverview />} />
          <Route path="/stats/analysis" element={<StatsGlobal />} />
          <Route path="/stats/projects" element={<StatsProject />} />
          <Route
            path="/stats/projects/:projectId"
            element={<StatsProjectDetail />}
          />
          <Route path="/stats/grade" element={<StatsGrade />} />
          <Route path="/stats/class/:classId" element={<StatsClass />} />
          <Route path="/records" element={<AllRecords />} />
          <Route path="/student" element={<StudentProfile />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
