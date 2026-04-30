import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../../store/useStore';

export default function BuildingStoryBar() {
  const {
    buildingStories,
    activeBuildingStoryId,
    setActiveBuildingStoryId,
    addBuildingStory,
    persistActivePlannerStory,
  } = useStore(
    useShallow((s) => ({
      buildingStories: s.buildingStories,
      activeBuildingStoryId: s.activeBuildingStoryId,
      setActiveBuildingStoryId: s.setActiveBuildingStoryId,
      addBuildingStory: s.addBuildingStory,
      persistActivePlannerStory: s.persistActivePlannerStory,
    }))
  );

  return (
    <div className="planner-story-bar" role="toolbar" aria-label="Building stories">
      <span className="planner-story-bar__label">Stories</span>
      <div className="planner-story-bar__tabs">
        {buildingStories.map((st) => (
          <button
            key={st.id}
            type="button"
            className={`planner-story-bar__tab${st.id === activeBuildingStoryId ? ' planner-story-bar__tab--active' : ''}`}
            onClick={() => setActiveBuildingStoryId(st.id)}
            title={`Edit ${st.name}`}
          >
            {st.name}
          </button>
        ))}
      </div>
      <div className="planner-story-bar__actions">
        <button type="button" className="planner-story-bar__add" onClick={() => addBuildingStory()} title="Add floor">
          + Floor
        </button>
        <button
          type="button"
          className="planner-story-bar__save"
          onClick={() => persistActivePlannerStory()}
          title="Save current floor plan to this story slot"
        >
          Save story
        </button>
      </div>
    </div>
  );
}
