import React from "react";
import {
  OrgProfileTab,
  OrgSharedLaboratoriesTab,
  OrgSharedEquipmentTab,
  OrgSharedStaffTab,
  OrgSharedTasksTab,
  OrgSharedQueriesTab,
  OrgSharedVacanciesTab,
} from "./org";
import JoinRequestsIncomingTab from "./JoinRequestsIncomingTab";

export default function OrganizationProfileSection({
  title = "Профиль организации",
  orgTab,
  setOrgTab,
  orgProfile,
  handleOrgChange,
  uploadOrgAvatar,
  uploading,
  saving,
  saveOrganization,
  toggleOrgPublish,
  onOrgAvatarInputRefReady,
  onOrgStaffFileInputRefsReady,
  onOrgEquipmentFileInputRefsReady,
  onOrgLabFileInputRefsReady,
  labDraft,
  handleLabDraft,
  orgEmployees,
  toggleLabEmployee,
  toggleLabEquipment,
  toggleLabTaskSolution,
  handleLabFiles,
  removeDraftImage,
  splitMedia,
  fileNameFromUrl,
  createLab,
  orgLabs,
  editingLabId,
  labEdit,
  handleLabEditChange,
  handleLabEditFiles,
  removeEditImage,
  updateLab,
  cancelEditLab,
  startEditLab,
  deleteLab,
  equipmentDraft,
  handleEquipmentDraft,
  handleEquipmentFiles,
  createEquipment,
  orgEquipment,
  editingEquipmentId,
  equipmentEdit,
  handleEquipmentEditChange,
  handleEquipmentEditFiles,
  updateEquipment,
  cancelEditEquipment,
  startEditEquipment,
  deleteEquipment,
  openGallery,
  taskDraft,
  setTaskDraft,
  createTask,
  toggleTaskLab,
  orgTasks,
  editingTaskId,
  taskEdit,
  handleTaskEditChange,
  updateTask,
  cancelEditTask,
  startEditTask,
  deleteTask,
  orgQueries,
  queryDraft,
  setQueryDraft,
  createQuery,
  editingQueryId,
  queryEdit,
  setQueryEdit,
  updateQuery,
  cancelEditQuery,
  startEditQuery,
  deleteQuery,
  toggleQueryLab,
  toggleQueryEmployee,
  orgVacancies,
  vacancyDraft,
  setVacancyDraft,
  createVacancy,
  editingVacancyId,
  vacancyEdit,
  setVacancyEdit,
  updateVacancy,
  cancelEditVacancy,
  startEditVacancy,
  deleteVacancy,
  employeeDraft,
  handleEmployeeDraftChange,
  uploadEmployeePhoto,
  employeeDraftPositionInput,
  setEmployeeDraftPositionInput,
  employeeDraftInterestsInput,
  setEmployeeDraftInterestsInput,
  addInterestPreset,
  researchInterestOptions,
  toggleEmployeeLab,
  newLabDraft,
  setNewLabDraft,
  createLabFromStaff,
  addEducation,
  removeEducation,
  showDraftPublications,
  setShowDraftPublications,
  updatePublication,
  removePublication,
  addPublication,
  employeeDraftContacts,
  handleEmployeeContacts,
  createEmployee,
  employeeEditId,
  employeeEdit,
  handleEmployeeEditChange,
  employeeEditPositionInput,
  setEmployeeEditPositionInput,
  employeeEditInterestsInput,
  setEmployeeEditInterestsInput,
  showEditPublications,
  setShowEditPublications,
  employeeEditPublicationList,
  updateEmployee,
  cancelEditEmployee,
  startEditEmployee,
  deleteEmployee,
  setEmployeeDraft,
  setEmployeeEdit,
  setEmployeePreview,
  setShowEmployeePublications,
  importEmployeeOpenAlex,
  importEmployeeOpenAlexPreview,
  employeeDraftImporting,
  toggleLabPublish,
  toggleQueryPublish,
  toggleVacancyPublish,
  toggleEquipmentLab,
  showProfileTab = true,
  hideTitle = false,
  onOrgRorLinked,
  roleKey,
  onError,
}) {
  return (
    <div className="profile-section">
      {!hideTitle && <h3 className="profile-section-title">{title}</h3>}
      <p className="profile-section-desc">Лаборатории, оборудование, вакансии и запросы</p>
      <div className="profile-tabs">
        {showProfileTab && (
          <button
            className={orgTab === "profile" ? "tab-btn active" : "tab-btn"}
            onClick={() => setOrgTab("profile")}
          >
            Профиль
          </button>
        )}
        <button
          className={orgTab === "labs" ? "tab-btn active" : "tab-btn"}
          onClick={() => setOrgTab("labs")}
        >
          Лаборатории
        </button>
        <button
          className={orgTab === "equipment" ? "tab-btn active" : "tab-btn"}
          onClick={() => setOrgTab("equipment")}
        >
          Оборудование
        </button>
        <button
          className={orgTab === "staff" ? "tab-btn active" : "tab-btn"}
          onClick={() => setOrgTab("staff")}
        >
          Сотрудники
        </button>
        <button
          className={orgTab === "tasks" ? "tab-btn active" : "tab-btn"}
          onClick={() => setOrgTab("tasks")}
        >
          Задачи
        </button>
        <button
          className={orgTab === "queries" ? "tab-btn active" : "tab-btn"}
          onClick={() => setOrgTab("queries")}
        >
          Запросы
        </button>
        <button
          className={orgTab === "vacancies" ? "tab-btn active" : "tab-btn"}
          onClick={() => setOrgTab("vacancies")}
        >
          Вакансии
        </button>
        {(roleKey === "lab_admin" || roleKey === "lab_representative") && (
          <button
            className={orgTab === "join-requests" ? "tab-btn active" : "tab-btn"}
            onClick={() => setOrgTab("join-requests")}
          >
            Запросы на присоединение
          </button>
        )}
      </div>

      {showProfileTab && orgTab === "profile" && (
        <OrgProfileTab
          orgProfile={orgProfile}
          handleOrgChange={handleOrgChange}
          uploadOrgAvatar={uploadOrgAvatar}
          uploading={uploading}
          saving={saving}
          saveOrganization={saveOrganization}
          toggleOrgPublish={toggleOrgPublish}
          onAvatarInputRefReady={onOrgAvatarInputRefReady}
          onOrgRorLinked={onOrgRorLinked}
        />
      )}

      {orgTab === "labs" && (
        <OrgSharedLaboratoriesTab
          labDraft={labDraft}
          handleLabDraft={handleLabDraft}
          orgEquipment={orgEquipment}
          toggleLabEquipment={toggleLabEquipment}
          orgTasks={orgTasks}
          toggleLabTaskSolution={toggleLabTaskSolution}
          orgEmployees={orgEmployees}
          toggleLabEmployee={toggleLabEmployee}
          handleLabFiles={handleLabFiles}
          removeDraftImage={removeDraftImage}
          splitMedia={splitMedia}
          fileNameFromUrl={fileNameFromUrl}
          createLab={createLab}
          orgLabs={orgLabs}
          editingLabId={editingLabId}
          labEdit={labEdit}
          handleLabEditChange={handleLabEditChange}
          handleLabEditFiles={handleLabEditFiles}
          removeEditImage={removeEditImage}
          updateLab={updateLab}
          cancelEditLab={cancelEditLab}
          startEditLab={startEditLab}
          deleteLab={deleteLab}
          openGallery={openGallery}
          toggleLabPublish={toggleLabPublish}
          uploading={uploading}
          saving={saving}
          onFileInputRefsReady={onOrgLabFileInputRefsReady}
        />
      )}

      {orgTab === "equipment" && (
        <OrgSharedEquipmentTab
          equipmentDraft={equipmentDraft}
          handleEquipmentDraft={handleEquipmentDraft}
          orgLabs={orgLabs}
          toggleEquipmentLab={toggleEquipmentLab}
          handleEquipmentFiles={handleEquipmentFiles}
          removeDraftImage={removeDraftImage}
          splitMedia={splitMedia}
          fileNameFromUrl={fileNameFromUrl}
          createEquipment={createEquipment}
          orgEquipment={orgEquipment}
          editingEquipmentId={editingEquipmentId}
          equipmentEdit={equipmentEdit}
          handleEquipmentEditChange={handleEquipmentEditChange}
          handleEquipmentEditFiles={handleEquipmentEditFiles}
          removeEditImage={removeEditImage}
          updateEquipment={updateEquipment}
          cancelEditEquipment={cancelEditEquipment}
          startEditEquipment={startEditEquipment}
          deleteEquipment={deleteEquipment}
          openGallery={openGallery}
          uploading={uploading}
          saving={saving}
          onFileInputRefsReady={onOrgEquipmentFileInputRefsReady}
        />
      )}

      {orgTab === "staff" && (
        <OrgSharedStaffTab
          employeeDraft={employeeDraft}
          handleEmployeeDraftChange={handleEmployeeDraftChange}
          setEmployeeDraft={setEmployeeDraft}
          uploadEmployeePhoto={uploadEmployeePhoto}
          employeeDraftPositionInput={employeeDraftPositionInput}
          setEmployeeDraftPositionInput={setEmployeeDraftPositionInput}
          employeeDraftInterestsInput={employeeDraftInterestsInput}
          setEmployeeDraftInterestsInput={setEmployeeDraftInterestsInput}
          researchInterestOptions={researchInterestOptions}
          addInterestPreset={addInterestPreset}
          orgLabs={orgLabs}
          toggleEmployeeLab={toggleEmployeeLab}
          newLabDraft={newLabDraft}
          setNewLabDraft={setNewLabDraft}
          createLabFromStaff={createLabFromStaff}
          addEducation={addEducation}
          removeEducation={removeEducation}
          showDraftPublications={showDraftPublications}
          setShowDraftPublications={setShowDraftPublications}
          updatePublication={updatePublication}
          removePublication={removePublication}
          addPublication={addPublication}
          handleEmployeeContacts={handleEmployeeContacts}
          createEmployee={createEmployee}
          employeeEditId={employeeEditId}
          employeeEdit={employeeEdit}
          handleEmployeeEditChange={handleEmployeeEditChange}
          employeeEditPositionInput={employeeEditPositionInput}
          setEmployeeEditPositionInput={setEmployeeEditPositionInput}
          employeeEditInterestsInput={employeeEditInterestsInput}
          setEmployeeEditInterestsInput={setEmployeeEditInterestsInput}
          showEditPublications={showEditPublications}
          setShowEditPublications={setShowEditPublications}
          updateEmployee={updateEmployee}
          cancelEditEmployee={cancelEditEmployee}
          startEditEmployee={startEditEmployee}
          deleteEmployee={deleteEmployee}
          orgEmployees={orgEmployees}
          setEmployeePreview={setEmployeePreview}
          setShowEmployeePublications={setShowEmployeePublications}
          importEmployeeOpenAlex={importEmployeeOpenAlex}
          importEmployeeOpenAlexPreview={importEmployeeOpenAlexPreview}
          employeeDraftImporting={employeeDraftImporting}
          uploading={uploading}
          saving={saving}
          onFileInputRefsReady={onOrgStaffFileInputRefsReady}
        />
      )}

      {orgTab === "tasks" && (
        <OrgSharedTasksTab
          taskDraft={taskDraft}
          setTaskDraft={setTaskDraft}
          orgLabs={orgLabs}
          toggleTaskLab={toggleTaskLab}
          createTask={createTask}
          orgTasks={orgTasks}
          editingTaskId={editingTaskId}
          taskEdit={taskEdit}
          handleTaskEditChange={handleTaskEditChange}
          updateTask={updateTask}
          cancelEditTask={cancelEditTask}
          startEditTask={startEditTask}
          deleteTask={deleteTask}
          saving={saving}
        />
      )}

      {orgTab === "queries" && (
        <OrgSharedQueriesTab
          queryDraft={queryDraft}
          setQueryDraft={setQueryDraft}
          orgLabs={orgLabs}
          orgEmployees={orgEmployees}
          orgTasks={orgTasks}
          toggleQueryLab={toggleQueryLab}
          toggleQueryEmployee={toggleQueryEmployee}
          createQuery={createQuery}
          orgQueries={orgQueries}
          editingQueryId={editingQueryId}
          queryEdit={queryEdit}
          setQueryEdit={setQueryEdit}
          updateQuery={updateQuery}
          cancelEditQuery={cancelEditQuery}
          startEditQuery={startEditQuery}
          deleteQuery={deleteQuery}
          toggleQueryPublish={toggleQueryPublish}
          saving={saving}
        />
      )}

      {orgTab === "vacancies" && (
        <OrgSharedVacanciesTab
          vacancyDraft={vacancyDraft}
          setVacancyDraft={setVacancyDraft}
          orgLabs={orgLabs}
          orgEmployees={orgEmployees}
          orgQueries={orgQueries}
          createVacancy={createVacancy}
          orgVacancies={orgVacancies}
          editingVacancyId={editingVacancyId}
          vacancyEdit={vacancyEdit}
          setVacancyEdit={setVacancyEdit}
          updateVacancy={updateVacancy}
          cancelEditVacancy={cancelEditVacancy}
          startEditVacancy={startEditVacancy}
          deleteVacancy={deleteVacancy}
          toggleVacancyPublish={toggleVacancyPublish}
          saving={saving}
        />
      )}

      {orgTab === "join-requests" && (
        <JoinRequestsIncomingTab roleKey={roleKey} onError={onError} />
      )}
    </div>
  );
}
