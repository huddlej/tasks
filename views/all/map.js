function(doc) {
    if (doc.task && !doc.is_deleted) {
        if (doc.sequence_number) {
            emit([doc.sequence_number, doc.modified_date, doc._id], doc);
        }
        else {
            emit([doc.modified_date, doc._id], doc);
        }
    }
}