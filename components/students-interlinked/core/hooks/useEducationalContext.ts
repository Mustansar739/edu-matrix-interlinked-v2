import { useState, useCallback, useEffect } from 'react';
import { EducationalContext } from '../types';

interface EducationalContextConfig {
  userId: string;
  autoSave?: boolean;
}

interface Subject {
  id: string;
  name: string;
  category: string;
  icon: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  subject: string;
  institution: string;
  instructor?: string;
}

interface StudyGroupOption {
  id: string;
  name: string;
  subject: string;
  memberCount: number;
  isJoined: boolean;
}

export const useEducationalContext = (config: EducationalContextConfig) => {
  const [context, setContext] = useState<EducationalContext>({});
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [studyGroups, setStudyGroups] = useState<StudyGroupOption[]>([]);
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available options
  useEffect(() => {
    const loadOptions = async () => {
      setIsLoading(true);
      try {
        const [subjectsRes, coursesRes, groupsRes, institutionsRes] = await Promise.all([
          fetch('/api/educational/subjects'),
          fetch('/api/educational/courses'),
          fetch('/api/educational/study-groups'),
          fetch('/api/educational/institutions'),
        ]);

        const [subjectsData, coursesData, groupsData, institutionsData] = await Promise.all([
          subjectsRes.json(),
          coursesRes.json(),
          groupsRes.json(),
          institutionsRes.json(),
        ]);

        setSubjects(subjectsData);
        setCourses(coursesData);
        setStudyGroups(groupsData);
        setInstitutions(institutionsData);
      } catch (err) {
        setError('Failed to load educational options');
      } finally {
        setIsLoading(false);
      }
    };

    loadOptions();
  }, []);

  // Load user's current context
  useEffect(() => {
    const loadUserContext = async () => {
      try {
        const response = await fetch(`/api/users/${config.userId}/educational-context`);
        if (response.ok) {
          const data = await response.json();
          setContext(data);
        }
      } catch (err) {
        console.error('Failed to load user educational context:', err);
      }
    };

    if (config.userId) {
      loadUserContext();
    }
  }, [config.userId]);

  const updateContext = useCallback(async (updates: Partial<EducationalContext>) => {
    const newContext = { ...context, ...updates };
    setContext(newContext);

    if (config.autoSave) {
      try {
        await fetch(`/api/users/${config.userId}/educational-context`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newContext),
        });
      } catch (err) {
        setError('Failed to save educational context');
      }
    }
  }, [context, config.autoSave, config.userId]);

  const setSubject = useCallback((subject: string) => {
    updateContext({ subject });
  }, [updateContext]);

  const setCourse = useCallback((course: string) => {
    updateContext({ course });
  }, [updateContext]);

  const setLevel = useCallback((level: EducationalContext['level']) => {
    updateContext({ level });
  }, [updateContext]);

  const setStudyGroup = useCallback((studyGroup: string) => {
    updateContext({ studyGroup });
  }, [updateContext]);

  const setInstitution = useCallback((institution: string) => {
    updateContext({ institution });
  }, [updateContext]);

  const addTag = useCallback((tag: string) => {
    const currentTags = context.tags || [];
    if (!currentTags.includes(tag)) {
      updateContext({ tags: [...currentTags, tag] });
    }
  }, [context.tags, updateContext]);

  const removeTag = useCallback((tag: string) => {
    const currentTags = context.tags || [];
    updateContext({ tags: currentTags.filter(t => t !== tag) });
  }, [context.tags, updateContext]);

  const clearContext = useCallback(() => {
    setContext({});
  }, []);

  const saveContext = useCallback(async () => {
    try {
      await fetch(`/api/users/${config.userId}/educational-context`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });
      return true;
    } catch (err) {
      setError('Failed to save educational context');
      return false;
    }
  }, [context, config.userId]);

  // Get filtered options based on current context
  const getFilteredCourses = useCallback(() => {
    if (!context.subject) return courses;
    return courses.filter(course => course.subject === context.subject);
  }, [courses, context.subject]);

  const getFilteredStudyGroups = useCallback(() => {
    if (!context.subject) return studyGroups;
    return studyGroups.filter(group => group.subject === context.subject);
  }, [studyGroups, context.subject]);

  const getContextString = useCallback(() => {
    const parts = [];
    if (context.subject) parts.push(context.subject);
    if (context.course) parts.push(context.course);
    if (context.level) parts.push(context.level);
    if (context.studyGroup) parts.push(context.studyGroup);
    return parts.join(' • ');
  }, [context]);

  const isContextComplete = useCallback(() => {
    return !!(context.subject && context.level);
  }, [context]);

  return {
    context,
    subjects,
    courses: getFilteredCourses(),
    studyGroups: getFilteredStudyGroups(),
    institutions,
    isLoading,
    error,
    updateContext,
    setSubject,
    setCourse,
    setLevel,
    setStudyGroup,
    setInstitution,
    addTag,
    removeTag,
    clearContext,
    saveContext,
    getContextString,
    isContextComplete,
  };
};
