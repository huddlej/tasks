var views = {
    "_id": "_design/tasks",
    "_rev": "3357955275",
    "language": "javascript",
    "views": {
        "all": {
            "map": "function(doc) {\n emit([doc.modified_date, doc._id], doc);\n}"
        }
    }
};