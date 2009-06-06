//<![CDATA[
var Task = {
    _tasks: {},
    db: $.couch.db("tasks"),

    load: function(tasks) {
        console.log(tasks);
        if(tasks && tasks.total_rows > 0) {
            for(var index = 0; index < tasks.total_rows; index++) {
                var task = tasks.rows[index].value;
                Task.add_to_dom(task);
            }
        }
    },

    save: function(task) {
        if (task._id) {
            Task.db.saveDoc(task, {success: function(response) {
                console.log("Saved doc successfully");
                console.log(response);
                console.log("Updated task with id: " + task._id);
            }});
        }
        else {
            Task.db.saveDoc(task, {success: function(response) {
                console.log("Saved doc successfully");
                console.log(response);
                console.log("Added task with new id: " + task._id);
                Task.add_to_dom(task);
            }});
        }
    },

    delete: function() {
        var id = $(this).parent().attr("id");
        console.log("Deleting task: " + id);
        var task = Task._tasks[id];

        // Delete task from the database by marking it as deleted.
        task.is_deleted = true;
        Task.db.saveDoc(task, {success: function(response) {
            console.log("Deleted doc successfully");
            console.log(response);
        }});

        // Delete task from task array.
        delete Task._tasks[id];

        // Delete task from the page.
        Task.delete_from_dom(task);

        return false;
    },

    add_to_dom: function(task) {
        // Add task to the list of available tasks.
        Task._tasks[task._id] = task;
        console.log("Adding task to DOM: " + task._id);
        var task_list = $("<li id=\"" + task._id + "\"></li>");

        var task_checkbox = $("<input type=\"checkbox\" />");
        task_checkbox.click(Task.toggle);

        var task_text = $("<p>" + task.task + "</p>");

        if (task.is_closed) {
            task_checkbox.attr("checked", "checked");
            task_text.addClass("closed");
        }
        else {
            task_text.dblclick(Task.edit);
        }

        task_list.append(task_checkbox);
        task_list.append(task_text);

        var delete_link = $("<a href=\"\">x</a>");
        delete_link.click(Task.delete);
        task_list.append("&nbsp;").append(delete_link);

        $("#unassigned-tasks").prepend(task_list);
    },

    delete_from_dom: function(task) {
        // Delete the given tasks from the DOM.  This does not alter the global
        // task array or delete the task from the database.
        $("#" + task._id).remove();
    },

    edit: function() {
        console.log("Editing task: " + $(this).text());
        // Make edit fields the length of the text to be edited.
        var size = String($(this).text().length);
        var task_input = $("<input type=\"text\" size=\"" + size + "\" />");
        task_input.val($(this).text());
        task_input.blur(Task.update);
        $(this).replaceWith(task_input);
        task_input.focus();
    },

    update: function() {
        var id = $(this).parent().attr("id");
        console.log("Updating edited task: " + id);
        var updated_text = $(this).val();

        // Only update the task if its value has changed.
        if(updated_text != Task._tasks[id].task) {
            Task._tasks[id].task = updated_text;
            Task._tasks[id].modified_date = new Date();

            var task = Task._tasks[id];
            Task.save(task);

            var list = $(this).parent().parent();
            console.log(list);
            var list_element = $(this).parent();
            console.log(list_element);
            list.prepend(list_element);
        }

        var task_text = $("<p></p>");
        task_text.text($(this).val());
        task_text.dblclick(Task.edit);
        $(this).replaceWith(task_text);
    },

    toggle: function() {
        /*
         * If the checkbox is checked after the click, the task has been closed.  If
         * the box is not checked after the click, the task has been opened.
         */
        var id = $(this).parent().attr("id");
        console.log("Toggling task: " + id);

        if ($(this).attr("checked")) {
            Task._tasks[id].is_closed = true;
            console.log("Task closed: " + $(this).parent().attr("id"));
            $(this).siblings("p").addClass("closed");
            $(this).siblings("p").unbind("click", Task.edit);
        }
        else {
            Task._tasks[id].is_closed = false;
            console.log("Task opened: " + $(this).parent().attr("id"));
            $(this).siblings("p").removeClass("closed");
            $(this).siblings("p").bind("click", Task.edit);
        }

        Task.save(Task._tasks[id]);
    }
};

function prepare_document() {
    // Load existing tasks.
    console.log("Loading existing tasks");
    Task.db.view("tasks/all", {success: Task.load});

    // Attach event handler to new task form.
    console.log("Attaching event handler to new task form");
    $("#new-task-form").submit(function () {
        var task = $("#new-task").val();

        if(task != "") {
            var modified_date = new Date();
            console.log("New task: " + task + " added at " + modified_date);
            data = {"task": task,
                    "modified_date": modified_date,
                    "is_closed": false};
            Task.save(data);
        }

        $("#new-task").val("");
        return false;
    });

    // Select the new task field.
    $("#new-task").focus();
}

// When the document is ready, prepare for managing tasks.
$(document).ready(prepare_document);
//]]>
