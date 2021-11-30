const connection = require("../../../../db");

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
      studentId: row[7],
    };
  });
  return records;
}

function parseExcelV122(rows) {
  // skip header
  rows.shift();
  // parse excel
  const records = rows.map((row) => {
    return {
      semester: row[0].toString(),
      classId: row[1].toString(),
      subject: {
        subjectId: row[2].toString(),
        subjectName: row[3],
        credit: row[4],
      },
      note: row[5],
      teacherId: row[6],
      studentIdsString: row[7],
      studentIds: row[7]
        .toString()
        .split(",")
        .map((sid) => sid.trim()),
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
  // console.log("🚧 --> getStudentsByIds --> studentIds", studentIds);
  const studentHistoryCol = (await connection).db().collection("StudentHistory");
  const studentPromises = studentIds
    .filter((sid) => sid !== "")
    .map(async (studentId) => {
      const doc = await studentHistoryCol.findOne(
        { "profiles.studentId": studentId.toString() },
        { projection: { "profiles.$": 1, _id: 0 } }
      );
      if (!doc) {
        console.log(`NOT FOUND STUDENT: studentId: ${studentId}`);
      }
      return doc ? doc.profiles[0] : null;
    });
  // console.log("🚧 --> getStudentsByIds --> studentPromises", await Promise.all(studentPromises));
  return (await Promise.all(studentPromises)).filter((std) => std !== null);
}

module.exports = { parseExcel, getTeacherById, getStudentsByIds, parseExcelV122 };
