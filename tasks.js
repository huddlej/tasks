//<![CDATA[
var Task = {
    _tasks: {},
    db: $.couch.db("tasks"),

    load: function(tasks) {
        console.log(tasks);
        if(tasks && tasks.total_rows > 0) {
            for(var index = 0; index < tasks.total_rows; index++) {
                var task = tasks.rows[index].value;
                Task.insert(task);
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
                Task.insert(task);
            }});
        }
    },

    insert: function(task) {
        // Add task to the list of available tasks.
        Task._tasks[task._id] = task;
        console.log("Inserting task into DOM: " + task._id);
        var task_list = $("<li id=\"" + task._id + "\"></li>");

        var task_checkbox = $("<input type=\"checkbox\" />");
        task_checkbox.click(Task.toggle);

        var task_text = $("<p>" + task.task + "</p>");

        if (task.is_closed) {
            task_checkbox.attr("checked", "checked");
            task_text.addClass("closed");
        }
        else {
            task_text.click(Task.edit);
        }

        task_list.append(task_checkbox);
        task_list.append(task_text);
        $("#unassigned-tasks").prepend(task_list);
    },

    edit: function() {
        console.log("Editing task: " + $(this).text());
        var task_input = $("<input type=\"text\" />");
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
        task_text.click(Task.edit);
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
