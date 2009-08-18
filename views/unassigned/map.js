function(doc) {
    if (doc.task && !doc.is_deleted && !doc.is_hidden && !doc.owner) {
        if (doc.sequence_number != undefined) {
            emit([doc.sequence_number, doc.modified_date, doc._id], doc);
        }
        else {
            emit([doc.modified_date, doc._id], doc);
        }
    }
}
