exports.deleteOne = (Model) => {
  try {
    return async (req, res) => {
      const doc = await Model.findByIdAndDelete(req.params.id);

      if (!doc) {
        const err = new Error('No document  found with that id');
        err.statusCode = 404;
        err.status = 'fail';
        return next(err);
      }

      res.status(204).json({
        status: 'success',
        data: null,
      });
    };
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.updateOne = (Model) => {
  try {
    return async (req, res) => {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });

      if (!doc) {
        const err = new Error('No document found with that id');
        err.statusCode = 404;
        err.status = 'fail';
        return next(err);
      }
      res.status(200).json({
        status: 'success',
        data: {
          doc,
        },
      });
    };
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.createOne = (Model) => {
  try {
    return async (req, res) => {
      const doc = await Model.create(req.body);

      res.status(201).json({
        status: 'success',
        data: { data: doc },
      });
    };
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.getOne = (Model, popOptions) => {
  try {
    return async (req, res, next) => {
      let query = await Model.findById(req.params.id);
      if (popOptions) query = query.populate(popOptions);

      const doc = await query;

      if (!doc) {
        const err = new Error('No document found with that id');
        err.statusCode = 404;
        err.status = 'fail';
        return next(err);
      }

      res.status(200).json({
        status: 'success',
        data: {
          data: doc,
        },
      });
    };
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.getAll = (Model) => {
  try {
    return async (req, res) => {
      //1(a).Filtering
      const queryObj = { ...req.query };
      const excludedFields = ['page', 'sort', 'limit', 'fields'];
      excludedFields.forEach((el) => delete queryObj[el]);

      //1(b).Advance Filtering
      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(
        /\b(gte|gt|lt|lte)\b/g,
        (match) => `$${match}`,
      );
      console.log(JSON.parse(queryStr));

      let query = Model.find(JSON.parse(queryStr));
      //2.Sorting

      if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
      }

      //3.Limiting
      if (req.query.fields) {
        const fields = req.query.fields.split(',').join(' ');
        query = query.select(fields);
      } else {
        query = query.select('-__v');
      }

      //4.Pagination

      const page = req.query.page * 1 || 1;
      const limit = req.query.limit * 1 || 100;

      const skip = (page - 1) * limit;
      query = query.skip(skip).limit(limit);

      if (req.query.page) {
        const numTours = await Model.countDocuments();
        if (skip > numTours) throw new Error('This page doesnt exist');
      }

      const doc = await query;

      res.status(200).json({
        status: 'success',
        results: doc.length,
        data: {
          doc,
        },
      });
    };
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};
