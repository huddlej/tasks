"use strict";

var log = function (message) {
    if (window && window.console) {
        window.console.debug(message);
    }
};

var Task = {
    tasks: {},
    owners: {},
    db: $.couch.db("tasks"),

    load: function (tasks) {
        var index, task;
        log(tasks);
        if (tasks && tasks.total_rows > 0) {
            for (index = 0; index < tasks.total_rows; index += 1) {
                task = tasks.rows[index].value;
                Task.add_to_dom(task);
            }
        }
    },

    save: function (task) {
        if (task._id) {
            Task.db.saveDoc(task, {success: function (response) {
                log("Saved doc successfully");
                log(response);
                log("Updated task with id: " + task._id);
            }});
        }
        else {
            Task.db.saveDoc(task, {success: function (response) {
                log("Saved doc successfully");
                log(response);
                log("Added task with new id: " + task._id);
                Task.add_to_dom(task);
                Task.update_order();
            }});
        }
    },

    remove: function () {
        var id, task;
        id = $(this).parent().attr("id");
        log("Deleting task: " + id);
        task = Task.tasks[id];

        // Remove task from the database by marking it as removed.
        task.is_deleted = true;
        Task.db.saveDoc(task, {success: function (response) {
            log("Removed doc successfully");
            log(response);
        }});

        // Remove task from task array.
        delete Task.tasks[id];

        // Remove task from the page.
        Task.remove_from_dom(task);

        return false;
    },

    add_to_dom: function (task) {
        // Add task to the list of available tasks.
        task.id = task._id;
        task.rev = task._rev;
        Task.tasks[task.id] = task;
        log("Adding task to DOM: " + task.id + " with sequence number " + task.sequence_number);
        var task_list = $("<li id=\"" + task.id + "\"></li>"),
            task_checkbox = $("<input type=\"checkbox\" />"),
            task_text = $("<p>" + task.task + "</p>"),
            delete_link = $("<a href=\"\">x</a>");

        task_checkbox.click(Task.toggle);

        if (task.is_closed) {
            task_checkbox.attr("checked", "checked");
            task_text.addClass("closed");
        }
        else {
            task_text.dblclick(Task.edit);
        }

        task_list.append(task_checkbox);
        task_list.append(task_text);

        delete_link.click(Task.remove);
        task_list.append("&nbsp;").append(delete_link);

        $("#unassigned-tasks").prepend(task_list);
    },

    remove_from_dom: function (task) {
        // Remove the given tasks from the DOM.  This does not alter the global
        // task array or remove the task from the database.
        $("#" + task.id).remove();
    },

    edit: function () {
        log("Editing task: " + $(this).text());
        // Make edit fields the length of the text to be edited.
        var size = String($(this).text().length),
            task_input = $("<input type=\"text\" size=\"" + size + "\" />"),
            form = $("<form></form>");
        task_input.val($(this).text());
        task_input.blur(Task.update);

        form.append(task_input);
        form.submit(function () {
            // Instead of testing for keypress equal to "enter" on  the input
            // field, use the form's submit method to blur  the input field.
            // This will trigger the correct action from the input field.
            $(this).find("input").blur();
            return false;
        });
        $(this).replaceWith(form);
        task_input.focus();
    },

    update: function () {
        var id,
            updated_text,
            task,
            task_text;
        id = $(this).parent().parent().attr("id");
        log("Updating edited task: " + id);
        updated_text = $(this).val();

        // Only update the task if its value has changed.
        if (updated_text !== Task.tasks[id].task) {
            Task.tasks[id].task = updated_text;
            Task.tasks[id].modified_date = new Date();

            task = Task.tasks[id];
            Task.save(task);
        }

        task_text = $("<p></p>");
        task_text.text($(this).val());
        task_text.dblclick(Task.edit);
        $(this).parent().replaceWith(task_text);

        return false;
    },

    update_order: function (event, ui) {
        log("Updating order of tasks...");

        // Update task order after manual reordering by the user.  If a task's
        // sequence number hasn't changed, don't update it.  These means only n
        // updates need to be made where n is the original offset of the moved
        // item in the list.
        var updated_tasks = [];
        $("#unassigned-tasks").children().each(function (i) {
            if (Task.tasks[this.id].sequence_number !== i + 1) {
                Task.tasks[this.id].sequence_number = i + 1;
                updated_tasks.push(Task.tasks[this.id]);
            }
        });

        // Bulk save any tasks that have changed.
        if (updated_tasks.length > 0) {
            log("Bulk save: ");
            log(updated_tasks);
            Task.db.bulkSave(updated_tasks,
                             {success: Task.update_bulk_doc_revisions});
        }
    },

    update_bulk_doc_revisions: function (bulk_save_response) {
        var i, response;
        for (i in bulk_save_response) {
            if (bulk_save_response.hasOwnProperty(i)) {
                response = bulk_save_response[i];
                log("Updated doc " + response.id + " from rev " + Task.tasks[response.id].rev + " to " + response.rev);
                Task.tasks[response.id].rev = response.rev;
            }
        }
    },

    toggle: function () {
        /*
         * If the checkbox is checked after the click, the task has been closed.  If
         * the box is not checked after the click, the task has been opened.
         */
        var id = $(this).parent().attr("id");
        log("Toggling task: " + id);

        if ($(this).attr("checked")) {
            Task.tasks[id].is_closed = true;
            log("Task closed: " + $(this).parent().attr("id"));
            $(this).siblings("p").addClass("closed");
            $(this).siblings("p").unbind("click", Task.edit);
        }
        else {
            Task.tasks[id].is_closed = false;
            log("Task opened: " + $(this).parent().attr("id"));
            $(this).siblings("p").removeClass("closed");
            $(this).siblings("p").bind("click", Task.edit);
        }

        Task.save(Task.tasks[id]);
    },

    hide_completed: function () {
        log("Hide completed tasks");
        var completed_tasks = [], index;
        for (index in Task.tasks) {
            if (Task.tasks[index].is_closed) {
                Task.tasks[index].is_hidden = true;
                completed_tasks.push(Task.tasks[index]);
                $("#" + Task.tasks[index].id).remove();
                delete Task.tasks[index];
            }
        }

        if (completed_tasks.length > 0) {
            Task.db.bulkSave(completed_tasks);
        }

        return false;
    },

    add_owner: function () {
        var input, owner;
        input = $("#new-owner");
        log(input.val());

        owner = {username: input.val()};
        Task.db.saveDoc(owner);

        $("#owners-tasks").append("<div>" + input.val() + "</div>");
        $("#new-owner").val("");
        Task.owners[owner.username] = owner;

        return false;
    },

    load_owners: function (owners) {
        var index,
            owner,
            title,
            owner_div;
        log(owners);
        if (owners && owners.total_rows > 0) {
            for (index = 0; index < owners.total_rows; index += 1) {
                owner = owners.rows[index].value;
                Task.owners[owner.username] = owner;

                if (owner.name) {
                    title = owner.name;
                }
                else {
                    title = owner.username;
                }

                owner_div = $("<div>" + title + "</div>");
                owner_div.append("<ul id=\"" + owner.username + "\"></ul>");
                $("#owners-tasks").append(owner_div);
            }

            log("Loading tasks by owner");
            Task.db.view([Task.db.name, "by_owner"].join("/"),
                         {success: Task.load_owner_tasks});
        }
    },

    load_owner_tasks: function (owner_tasks) {
        var index,
            username,
            task;
        log("Got tasks by owner");
        if (owner_tasks && owner_tasks.total_rows > 0) {
            for (index = 0; index < owner_tasks.total_rows; index += 1) {
                username = owner_tasks.rows[index].key;
                task = owner_tasks.rows[index].value;
                $("#" + username).append("<li>" + task.task + "</li>");
            }
        }
    }
};

function prepare_document() {
    // Load existing tasks.
    log("Loading existing tasks");
    Task.db.view([Task.db.name, "unassigned?descending=true"].join("/"),
                 {success: Task.load});
//     Task.db.view([Task.db.name, "owners"].join("/"),
//                  {success: Task.load_owners});

    // Attach event handler to new task form.
    log("Attaching event handler to new task form");
    $("#new-task-form").submit(function () {
        var task,
            modified_date,
            data;
        task = $("#new-task").val();

        if (task !== "") {
            modified_date = new Date();
            log("New task: " + task + " added at " + modified_date);
            data = {"task": task,
                    "modified_date": modified_date,
                    "is_closed": false};
            Task.save(data);
        }

        $("#new-task").val("");
        return false;
    });

//     // Attach event handler to new owner form.
//     $("#new-owner-form").submit(Task.add_owner);

    // Make the unassigned task list sortable.
    $("#unassigned-tasks").sortable({stop: Task.update_order});

    // Make owner boxes droppable for tasks.
    //$("#unassigned-tasks li").draggable();
    // $("#dragthis").draggable();
//     $("#drophere").droppable({
//         drop: function (event, ui) {
//             log("hello world.");
//         }
//     });

    // Attach event handler to "hide completed" link.
    $("#hide_completed").click(Task.hide_completed);

    // Select the new task field.
    $("#new-task").focus();
}

// When the document is ready, prepare for managing tasks.
$(document).ready(prepare_document);