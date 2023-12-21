const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { format, isValid } = require("date-fns");
const path = require("path");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "todoApplication.db");
let dbObject = null;

const initializeDbAndServer = async () => {
  try {
    dbObject = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running on http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const hasStatusProperty = (requestQuery) => requestQuery.status !== undefined;

const hasPriorityProperty = (requestQuery) =>
  requestQuery.priority !== undefined;

const hasCategoryProperty = (requestQuery) =>
  requestQuery.category !== undefined;

const hasPriorityStatusProperty = (requestQuery) =>
  requestQuery.status !== undefined && requestQuery.priority !== undefined;

const hasCategoryStatusProperty = (requestQuery) =>
  requestQuery.category !== undefined && requestQuery.status !== undefined;

const hasCategoryPriorityProperty = (requestQuery) =>
  requestQuery.priority !== undefined && requestQuery.category !== undefined;

const isValidStatus = (statusText) =>
  statusText === "TO DO" ||
  statusText === "IN PROGRESS" ||
  statusText === "DONE";

const isValidPriority = (priorityText) =>
  priorityText === "HIGH" ||
  priorityText === "MEDIUM" ||
  priorityText === "LOW";

const isValidCategory = (categoryText) =>
  categoryText === "WORK" ||
  categoryText === "HOME" ||
  categoryText === "LEARNING";

const isValidDate = (date) => isValid(date);

const formattedDate = (date) => format(date, "yyyy-MM-dd");

const getResponseObject = (data) => ({
  id: data.id,
  todo: data.todo,
  priority: data.priority,
  status: data.status,
  category: data.category,
  dueDate: data.due_date,
});

const isValidBody = (req, res, next) => {
  const { priority, status, category, dueDate } = req.body;
  switch (true) {
    case !(isValidStatus(status) || status === undefined):
      res.status(400);
      res.send("Invalid Todo Status");
      break;
    case !(isValidPriority(priority) || priority === undefined):
      res.status(400);
      res.send("Invalid Todo Priority");
      break;
    case !(isValidCategory(category) || category === undefined):
      res.status(400);
      res.send("Invalid Todo Category");
      break;
    case !(isValidDate(new Date(dueDate)) || dueDate === undefined):
      res.status(400);
      res.send("Invalid Due Date");
      break;
    default:
      next();
      break;
  }
};

//Api 1

app.get("/todos/", async (req, res) => {
  const requestQuery = req.query;
  let dbQuery;
  const { search_q = "" } = requestQuery;
  switch (true) {
    case hasPriorityStatusProperty(requestQuery):
      if (
        isValidStatus(requestQuery.status) &&
        isValidPriority(requestQuery.priority)
      ) {
        dbQuery = `Select * from todo where status = '${requestQuery.status}' and priority = '${requestQuery.priority}'`;
      } else {
        res.status(400);
        isValidStatus(requestQuery.status)
          ? res.send("Invalid Todo Priority")
          : res.send("Invalid Todo Status");
      }
      break;
    case hasCategoryStatusProperty(requestQuery):
      if (
        isValidCategory(requestQuery.category) &&
        isValidStatus(requestQuery.status)
      ) {
        dbQuery = `Select * from todo where status = '${requestQuery.status}' and category = '${requestQuery.category}'`;
      } else {
        res.status(400);
        isValidStatus(requestQuery.status)
          ? res.send("Invalid Todo Category")
          : res.send("Invalid Todo Status");
      }
      break;
    case hasCategoryPriorityProperty(requestQuery):
      if (
        isValidCategory(requestQuery.category) &&
        isValidPriority(requestQuery.priority)
      ) {
        dbQuery = `Select * from todo where category = '${requestQuery.category}' and priority = '${requestQuery.priority}'`;
      } else {
        isValidPriority(requestQuery.priority)
          ? res.send("Invalid Todo Category")
          : res.send("Invalid Todo Priority");
      }
      break;
    case hasStatusProperty(requestQuery):
      if (isValidStatus(requestQuery.status)) {
        dbQuery = `Select * from todo where status = '${requestQuery.status}'`;
      } else {
        res.status(400);
        res.send("Invalid Todo Status");
      }
      break;
    case hasPriorityProperty(requestQuery):
      if (isValidPriority(requestQuery.priority)) {
        dbQuery = `Select * from todo where priority = '${requestQuery.priority}'`;
      } else {
        res.status(400);
        res.snd("Invalid Todo Priority");
      }
      break;
    case hasCategoryProperty(requestQuery):
      if (isValidCategory(requestQuery.category)) {
        dbQuery = `Select * from todo where category = '${requestQuery.category}'`;
      } else {
        res.status(400);
        res.send("Invalid Todo Category");
      }
      break;
    default:
      dbQuery = `Select * from todo where todo LIKE '%${search_q}%'`;
      break;
  }
  try{
    const dbData = await dbObject.all(dbQuery);
  res.send(dbData.map((eachData) => getResponseObject(eachData)));
  }
  catch(e){
      console.log(e);
  }
});

// Api 2

app.get("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const getTodoQuery = `select * from todo where id=${todoId}`;
  const dbData = await dbObject.get(getTodoQuery);
  res.send(getResponseObject(dbData));
});

//Api 3

app.get("/agenda/", async (req, res) => {
  const { date } = req.query;
  const dateObj = new Date(date);
  if (isValidDate(dateObj)) {
    const updatedFormat = formattedDate(dateObj);
    try {
      const dbQuery = `Select * from todo where due_date='${updatedFormat}'`;
      const data = await dbObject.get(dbQuery);
      res.send(getResponseObject(data));
    } catch (e) {
      res.send("Invalid Due Date");
    }
  } else {
    res.status(400);
    res.send("Invalid Due Date");
  }
});

//Api 4

app.post("/todos/", isValidBody, async (req, res) => {
  const { id, todo, priority, status, category, dueDate } = req.body;
  const createTodoQuery = `Insert into todo(id, todo, priority, status, category, due_date) values(${id}, '${todo}', '${priority}', "${status}", '${category}', '${dueDate}')`;
  await dbObject.run(createTodoQuery);
  res.send("Todo Successfully Added");
});

//Api 5

app.put("/todos/:todoId/", isValidBody, async (req, res) => {
  const { todoId } = req.params;
  const reqBody = req.body;
  let updatedProperty;
  switch (true) {
    case reqBody.status !== undefined:
      updatedProperty = "Status";
      break;
    case reqBody.priority !== undefined:
      updatedProperty = "Priority";
      break;
    case reqBody.todo !== undefined:
      updatedProperty = "Todo";
      break;
    case reqBody.category !== undefined:
      updatedProperty = "Category";
      break;
    default:
      updatedProperty = "Due Date";
  }
  const previousDataQuery = `Select * from todo where id=${todoId}`;
  const previousData = await dbObject.get(previousDataQuery);
  const {
    status = previousData.status,
    priority = previousData.priority,
    todo = previousData.todo,
    category = previousData.category,
    dueDate = previousData.due_date,
  } = reqBody;
  const updateDbQuery = `Update todo set status='${status}', priority='${priority}', todo='${todo}', category='${category}', due_date='${dueDate}' where id=${todoId}`;
  await dbObject.run(updateDbQuery);
  res.send(`${updatedProperty} Updated`);
});

//Api 6
app.delete("/todos/:todoId", async (req, res) => {
  const { todoId } = req.params;
  const deleteQuery = `Delete from todo where id=${todoId}`;
  await dbObject.run(deleteQuery);
  res.send("Todo Deleted");
});

module.exports = app;
