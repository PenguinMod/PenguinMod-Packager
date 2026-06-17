import { CannotAccessProjectError } from '../common/errors';
import request from '../common/request';

const getProjectMetadata = async (id) => {
  try {
    const meta = await request({
      url: [
        `https://projects.penguinmod.com/api/v1/projects/getproject?projectID=${id}&requestType=metadata`
      ],
      type: 'json'
    });
    return {
      title: meta.title
    };
  } catch (e) {
    if (e && e.status === 404) {
      throw new CannotAccessProjectError(`Cannot access project ${id}`);
    }
    throw e;
  }
};

export default getProjectMetadata;
