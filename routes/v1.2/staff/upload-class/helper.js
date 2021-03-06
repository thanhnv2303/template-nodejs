const connection = require("../../../db");

function parseExcel(rows) {
  // skip header
  rows.shift();
  // parse excel
  const records = rows.map((row) => {
    return {
      semester: row[0].toString(),
      classId: row[1].toString(),
      subjectId: row[2].toString(),
      subjectName: row[3],
      credit: row[4],
      note: row[5],
      teacherId: row[6].toString(),
      studentId: row[8],
    };
  });
  return records;
}

async function getTeacherById(teacherId) {
  const teacherHistoryCol = (await connection).db().collection("TeacherHistory");
  const doc = await teacherHistoryCol.findOne({ "profiles.teacherId": teacherId }, { projection: { "profiles.$": 1, _id: 0 } });
  return doc ? doc.profiles[0] : null;
}

async function getStudentsByIds(studentIds) {
  const studentHistoryCol = (await connection).db().collection("StudentHistory");
  const studentPromises = studentIds.map(async (studentId) => {
    const doc = await studentHistoryCol.findOne(
      { "profiles.studentId": studentId.toString() },
      { projection: { "profiles.$": 1, _id: 0 } }
    );
    return doc ? doc.profiles[0] : null;
  });
  return Promise.all(studentPromises);
}

module.exports = { parseExcel, getTeacherById, getStudentsByIds };
